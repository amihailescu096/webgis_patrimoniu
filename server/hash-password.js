import { passwordHash } from './server.js'
const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '')
if (password.length < 12) throw new Error('Folosește o parolă de cel puțin 12 caractere.')
console.log(passwordHash(password))
