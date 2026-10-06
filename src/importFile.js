export const MAX_FILE_BYTES = 150 * 1024 * 1024
export function importFile(file) {
  if (file.size > MAX_FILE_BYTES) return Promise.reject(new Error('Limita este de 150 MB per fișier.'))
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./import.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => { worker.terminate(); if (data.error) reject(new Error(data.error)); else resolve(data) }
    worker.onerror = () => { worker.terminate(); reject(new Error('Importul a eșuat. Verifică fișierul și memoria disponibilă.')) }
    worker.postMessage(file)
  })
}
