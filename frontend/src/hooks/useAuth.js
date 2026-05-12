import { useAuthStore } from '../store'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const useAuth = () => {
  const store = useAuthStore()
  return store
}

export const useRequireAuth = () => {
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate('/login')
    }
  }, [auth.isAuthenticated, navigate])

  return auth
}

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue]
}
