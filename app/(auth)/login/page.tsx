import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ | SEA-POS',
}

export default function LoginPage() {
  return <LoginForm />
}
