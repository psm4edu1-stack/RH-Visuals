import { databasePath, initializeDatabase } from './database.js'

initializeDatabase()
console.log(`[db] Ready at ${databasePath}`)
