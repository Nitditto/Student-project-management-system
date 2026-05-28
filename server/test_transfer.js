
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { Project } from './models/project.js';
import { User } from './models/user.js';
import jwt from 'jsonwebtoken';

config();

async function test() {
  await mongoose.connect(process.env.MONGO_URL);
  
  const project = await Project.findOne({ 'members.1': { $exists: true } }).populate('members');
  if (!project) {
    console.log('No project found with multiple members.');
    return;
  }
  
  const currentLeader = await User.findById(project.student);
  const newLeaderId = project.members.find(m => m._id.toString() !== currentLeader._id.toString())._id;
  
  const token = jwt.sign({ id: currentLeader._id, role: 'Student' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
  
  console.log('Testing transfer API. Project:', project._id);
  
  try {
    const res = await fetch(`http://localhost:4000/api/v1/student/projects/${project._id}/transfer-leadership`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify({ newLeaderId: newLeaderId.toString() })
    });
    const data = await res.json();
    console.log('API Status:', res.status);
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('API Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

test();
