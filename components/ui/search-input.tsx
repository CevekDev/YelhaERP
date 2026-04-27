'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SearchInputProps {
  placeholder?: string
  onSearch: (value: string) => void
  debounceMs?: number
}

export function SearchInput({ placeholder = 'Rechercher...', onSearch, debounceMs = 350 }: SearchInputProps) {
  const [value, setValue] = useState('')
  let timer: ReturnType<typeof setTimeout>

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    timer = setTimeout(() => onSearch(v), debounceMs)
  }, [onSearch, debounceMs])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  )
}
