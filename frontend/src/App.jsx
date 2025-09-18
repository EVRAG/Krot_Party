import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function CheckIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.59a.75.75 0 0 1 1.06 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 4.72-4.72Z" clipRule="evenodd" />
    </svg>
  )
}

function XIcon({ className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM9.53 8.47a.75.75 0 0 0-1.06 1.06L10.94 12l-2.47 2.47a.75.75 0 1 0 1.06 1.06L12 13.06l2.47 2.47a.75.75 0 1 0 1.06-1.06L13.06 12l2.47-2.47a.75.75 0 0 0-1.06-1.06L12 10.94 9.53 8.47Z" clipRule="evenodd" />
    </svg>
  )
}

export default function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/items`).then(r => r.json()).then(setItems).finally(() => setLoading(false))
    const es = new EventSource(`${API_BASE}/events`)
    es.addEventListener('created', (e) => {
      const msg = JSON.parse(e.data)
      setItems(prev => [msg, ...prev])
    })
    es.addEventListener('accepted', (e) => {
      const { id } = JSON.parse(e.data)
      setItems(prev => prev.map(x => x.id === id ? { ...x, status: 'accepted' } : x))
    })
    es.addEventListener('cancelled', (e) => {
      const { id } = JSON.parse(e.data)
      setItems(prev => prev.map(x => x.id === id ? { ...x, status: 'cancelled' } : x))
    })
    return () => es.close()
  }, [])

  const handleIngest = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const r = await fetch(`${API_BASE}/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: input.trim() }) })
    if (r.ok) setInput('')
  }

  const handleAccept = async (id) => {
    await fetch(`${API_BASE}/accept/${id}`, { method: 'POST' })
  }
  const handleCancel = async (id) => {
    await fetch(`${API_BASE}/cancel/${id}`, { method: 'POST' })
  }

  return (
    <div className="mx-auto max-w-xl sm:max-w-2xl p-3 sm:p-6">
      <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Входящие сообщения</h1>

      <form onSubmit={handleIngest} className="mt-4 flex gap-2">
        <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Текст" className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
        <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500">Добавить</button>
      </form>

      <div className="mt-6 space-y-3">
        {loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка…</div>
        )}
        {items.map((m) => {
          const isDone = m.status === 'accepted' || m.status === 'cancelled'
          const cardBase = isDone
            ? 'bg-gray-100 ring-gray-200 opacity-60 dark:bg-gray-800 dark:ring-white/10'
            : 'bg-white ring-gray-300 dark:bg-gray-900 dark:ring-white/15'
          const titleClass = isDone
            ? 'text-gray-400 dark:text-gray-500'
            : 'text-gray-900 dark:text-white'
          return (
            <div key={m.id} className={classNames('rounded-lg ring-1 p-4 transition-colors', cardBase)}>
              <div className={classNames('text-sm font-medium break-words', titleClass)}>{m.text}</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{new Date(m.createdAt || Date.now()).toLocaleString()} · {m.status}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={()=>handleAccept(m.id)}
                  disabled={m.status === 'accepted'}
                  className="inline-flex justify-center items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/15 dark:disabled:hover:bg-white/10"
                  title="Принять"
                >
                  <span className="text-green-600 dark:text-green-400 mr-2"><CheckIcon className="h-5 w-5" /></span>
                  Принять
                </button>
                <button
                  type="button"
                  onClick={()=>handleCancel(m.id)}
                  disabled={m.status === 'cancelled'}
                  className="inline-flex justify-center items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/15 dark:disabled:hover:bg-white/10"
                  title="Отменить"
                >
                  <span className="text-red-600 dark:text-red-400 mr-2"><XIcon className="h-5 w-5" /></span>
                  Отменить
                </button>
              </div>
            </div>
          )
        })}
        {!loading && items.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">Список пуст</div>
        )}
      </div>
    </div>
  )
}
