import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initCronJobs } from "./cron/evaluatorCron.js";


// DATABASE CONNECTION

connectDB()

// START SERVER
const PORT = process.env.PORT || 4000

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
    initCronJobs(); // Initialize cron jobs
})

// ERROR HANDLING

process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection at: ${err.message}`)
    server.close(() => process.exit(1))
})

process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception at: ${err.message}`)
    process.exit(1)
})

export default server;


