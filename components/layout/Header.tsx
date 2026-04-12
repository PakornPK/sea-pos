'use client'

type HeaderProps = {
  email: string
}

export function Header({ email }: HeaderProps) {
  return (
    <header className="flex h-14 items-center border-b bg-background px-6">
      <span className="ml-auto text-sm text-muted-foreground">{email}</span>
    </header>
  )
}
