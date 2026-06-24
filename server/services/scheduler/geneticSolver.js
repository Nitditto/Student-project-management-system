import { ISchedulerSolver } from "./solverStrategy.js";

/**
 * Concrete Solver Strategy using a Genetic Algorithm.
 * Decoupled from the rules engine and offloaded to a worker thread.
 */
export class GeneticAlgorithmSolver extends ISchedulerSolver {
  async solve(data, evaluator, config = {}) {
    const {
      projects = [],
      teachers = [],
      rooms = [],
      timeSlots = [],
      maxProjectsPerSession = 5
    } = data;

    const populationSize = config.populationSize || 100;
    const generations = config.generations || 200;
    const mutationRate = config.mutationRate || 0.15;

    if (projects.length === 0 || teachers.length === 0 || rooms.length === 0 || timeSlots.length === 0) {
      throw new Error("Cannot run scheduler: projects, teachers, rooms, and timeSlots must not be empty.");
    }

    // Context for rule evaluator
    const teacherMap = new Map(teachers.map(t => [t._id.toString(), t]));
    const context = { teacherMap };

    // Helper: Translate chromosome (sessions) to flat assignments for rules
    const chromosomeToAssignments = (chromosome) => {
      const assignments = [];
      for (const session of chromosome) {
        if (!session.projects || session.projects.length === 0) continue;
        for (const pItem of session.projects) {
          assignments.push({
            project: pItem.project,
            councilMembers: session.councilMembers,
            reviewer: pItem.reviewer,
            room: session.room,
            timeSlot: session.timeSlot
          });
        }
      }
      return assignments;
    };

    // Helper: Initialize a random chromosome
    const createRandomChromosome = () => {
      // Create empty sessions for all combination of Room x Slot
      const sessions = [];
      for (const slot of timeSlots) {
        for (const room of rooms) {
          sessions.push({
            room,
            timeSlot: slot,
            councilMembers: [], // Will assign later
            projects: []
          });
        }
      }

      // Distribute projects randomly into sessions
      const tempProjects = [...projects];
      while (tempProjects.length > 0) {
        const project = tempProjects.pop();
        // Find a random session that isn't full
        const availableSessions = sessions.filter(s => s.projects.length < maxProjectsPerSession);
        if (availableSessions.length === 0) {
          // If all sessions are full, force assign to a random one
          const randSess = sessions[Math.floor(Math.random() * sessions.length)];
          randSess.projects.push({ project, reviewer: null });
        } else {
          const randSess = availableSessions[Math.floor(Math.random() * availableSessions.length)];
          randSess.projects.push({ project, reviewer: null });
        }
      }

      // Assign random teachers & reviewers to active sessions
      for (const session of sessions) {
        if (session.projects.length === 0) continue;

        // Choose 3 distinct random teachers for council
        const shuffledTeachers = [...teachers].sort(() => 0.5 - Math.random());
        session.councilMembers = [
          { teacher: shuffledTeachers[0]._id, role: "chairman", weight: 2.0 },
          { teacher: shuffledTeachers[1]._id, role: "secretary", weight: 1.0 },
          { teacher: shuffledTeachers[2]._id, role: "member", weight: 1.0 }
        ];

        // Choose reviewer for each project in this session (cannot be supervisor)
        for (const pItem of session.projects) {
          const supervisorId = pItem.project.supervisor?.toString();
          const possibleReviewers = teachers.filter(t => t._id.toString() !== supervisorId);
          if (possibleReviewers.length > 0) {
            const randReviewer = possibleReviewers[Math.floor(Math.random() * possibleReviewers.length)];
            pItem.reviewer = randReviewer._id;
          } else {
            pItem.reviewer = teachers[0]._id; // Fallback
          }
        }
      }

      return sessions;
    };

    // Helper: Compute fitness
    const getFitness = (chromosome) => {
      const assignments = chromosomeToAssignments(chromosome);
      if (assignments.length === 0) return -Infinity;
      return evaluator.evaluate(assignments, context);
    };

    // Initialize Population
    let population = [];
    for (let i = 0; i < populationSize; i++) {
      const chrom = createRandomChromosome();
      population.push({
        chromosome: chrom,
        fitness: getFitness(chrom)
      });
    }

    let bestSolution = population[0];

    // Evolutionary Loop
    for (let gen = 0; gen < generations; gen++) {
      // Sort by fitness descending
      population.sort((a, b) => b.fitness - a.fitness);

      if (population[0].fitness > bestSolution.fitness) {
        bestSolution = JSON.parse(JSON.stringify(population[0])); // Deep clone best
      }

      // If we found a perfect fit or algorithm converged, optionally break
      if (bestSolution.fitness === -Infinity && population[0].fitness === -Infinity) {
        // All solutions violate hard constraints. Try to introduce fresh mutants
        population = population.map((ind, idx) => {
          if (idx > populationSize * 0.2) { // Keep top 20% even if bad
            const chrom = createRandomChromosome();
            return { chromosome: chrom, fitness: getFitness(chrom) };
          }
          return ind;
        });
        continue;
      }

      const nextGeneration = [];

      // Elitism: Keep top 10%
      const eliteSize = Math.max(2, Math.floor(populationSize * 0.1));
      for (let i = 0; i < eliteSize; i++) {
        nextGeneration.push(JSON.parse(JSON.stringify(population[i])));
      }

      // Selection & Crossover to fill population
      while (nextGeneration.length < populationSize) {
        // Tournament Selection
        const selectParent = () => {
          const tournament = [];
          for (let i = 0; i < 4; i++) {
            tournament.push(population[Math.floor(Math.random() * population.length)]);
          }
          tournament.sort((a, b) => b.fitness - a.fitness);
          return tournament[0];
        };

        const parentA = selectParent();
        const parentB = selectParent();

        // Crossover
        const childChromosome = [];
        for (let i = 0; i < parentA.chromosome.length; i++) {
          // Uniform crossover of sessions
          if (Math.random() < 0.5) {
            childChromosome.push(JSON.parse(JSON.stringify(parentA.chromosome[i])));
          } else {
            childChromosome.push(JSON.parse(JSON.stringify(parentB.chromosome[i])));
          }
        }

        // Adjust project duplicates in child (ensure every project is scheduled exactly once)
        const scheduledProjectIds = new Set();
        for (const session of childChromosome) {
          session.projects = session.projects.filter(pItem => {
            const pId = pItem.project._id.toString();
            if (scheduledProjectIds.has(pId)) {
              return false; // Remove duplicate assignment
            }
            scheduledProjectIds.add(pId);
            return true;
          });
        }

        // Re-distribute any missing projects
        const missingProjects = projects.filter(p => !scheduledProjectIds.has(p._id.toString()));
        for (const project of missingProjects) {
          const emptySess = childChromosome.filter(s => s.projects.length < maxProjectsPerSession);
          const targetSess = emptySess.length > 0 
            ? emptySess[Math.floor(Math.random() * emptySess.length)] 
            : childChromosome[Math.floor(Math.random() * childChromosome.length)];
          
          const supervisorId = project.supervisor?.toString();
          const possibleReviewers = teachers.filter(t => t._id.toString() !== supervisorId);
          const reviewer = possibleReviewers.length > 0 
            ? possibleReviewers[Math.floor(Math.random() * possibleReviewers.length)]._id 
            : teachers[0]._id;

          targetSess.projects.push({ project, reviewer });
        }

        // Mutation
        if (Math.random() < mutationRate) {
          // Mutate by swapping a project to a random session
          const activeSessions = childChromosome.filter(s => s.projects.length > 0);
          if (activeSessions.length > 0) {
            const randSessSrc = activeSessions[Math.floor(Math.random() * activeSessions.length)];
            const pIndex = Math.floor(Math.random() * randSessSrc.projects.length);
            const [pItem] = randSessSrc.projects.splice(pIndex, 1);

            const randSessDest = childChromosome[Math.floor(Math.random() * childChromosome.length)];
            randSessDest.projects.push(pItem);
          }

          // Mutate a random session's teachers
          const randSess = childChromosome[Math.floor(Math.random() * childChromosome.length)];
          if (randSess.projects.length > 0) {
            const shuffledTeachers = [...teachers].sort(() => 0.5 - Math.random());
            randSess.councilMembers = [
              { teacher: shuffledTeachers[0]._id, role: "chairman", weight: 2.0 },
              { teacher: shuffledTeachers[1]._id, role: "secretary", weight: 1.0 },
              { teacher: shuffledTeachers[2]._id, role: "member", weight: 1.0 }
            ];
          }
        }

        nextGeneration.push({
          chromosome: childChromosome,
          fitness: getFitness(childChromosome)
        });
      }

      population = nextGeneration;
    }

    // Final sorting to get absolute best
    population.sort((a, b) => b.fitness - a.fitness);
    if (population[0].fitness > bestSolution.fitness) {
      bestSolution = population[0];
    }

    return {
      schedule: bestSolution.chromosome,
      fitnessScore: bestSolution.fitness
    };
  }
}
