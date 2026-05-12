import { useState } from 'react'
import { Card, Input, Button } from 'antd'
import api from '../services/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    const response = await api.post('/auth/login', {
      email,
      password
    })

    console.log(response.data)
  }

  return (
    <div style={{ padding: 50 }}>
      <Card title="Login">
        <Input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <Input.Password
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <Button type="primary" onClick={handleLogin}>
          Login
        </Button>
      </Card>
    </div>
  )
}