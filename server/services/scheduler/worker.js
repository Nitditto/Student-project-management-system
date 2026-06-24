import { parentPort, workerData } from "worker_threads";
import { RuleEvaluator } from "./ruleEvaluator.js";
import { GeneticAlgorithmSolver } from "./geneticSolver.js";

// Import all pluggable constraints statically
import { NoSupervisorInCouncilConstraint } from "./rules/NoSupervisorInCouncilConstraint.js";
import { NoTeacherOverbookingConstraint } from "./rules/NoTeacherOverbookingConstraint.js";
import { NoRoomOverbookingConstraint } from "./rules/NoRoomOverbookingConstraint.js";
import { ExpertiseCosineMatchConstraint } from "./rules/ExpertiseCosineMatchConstraint.js";

const runSolver = async () => {
  try {
    const { data, config } = workerData;

    // 1. Initialize constraints based on settings
    const rules = [
      new NoSupervisorInCouncilConstraint(),
      new NoTeacherOverbookingConstraint(),
      new NoRoomOverbookingConstraint(),
      new ExpertiseCosineMatchConstraint(config.expertiseWeight || 5.0)
    ];

    const evaluator = new RuleEvaluator(rules);

    // 2. Select Solver Strategy (supports swap via config)
    let solver;
    if (config.solverType === "genetic_algorithm") {
      solver = new GeneticAlgorithmSolver();
    } else {
      // Fallback/Default
      solver = new GeneticAlgorithmSolver();
    }

    console.log(`[Scheduler Worker] Running ${config.solverType || "genetic_algorithm"} Solver...`);
    const start = performance.now();
    
    // Execute optimization loop
    const solution = await solver.solve(data, evaluator, config);
    
    const end = performance.now();
    const executionTimeMs = Math.round(end - start);

    // 3. Post solution back to main thread
    parentPort.postMessage({
      success: true,
      data: {
        schedule: solution.schedule,
        fitnessScore: solution.fitnessScore,
        executionTimeMs
      }
    });

  } catch (error) {
    console.error("[Scheduler Worker] Execution failed:", error);
    parentPort.postMessage({
      success: false,
      error: error.message || "An unknown solver error occurred."
    });
  }
};

// Start execution immediately in worker thread context
void runSolver();
