'use client'
import { useState, ChangeEvent } from 'react'
import { supabase } from '../../lib/supabase'

export default function Add() {
  const [name, setName] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const addProduct = async () => {
    if (!name.trim()) return alert('Please enter a product name')

    setLoading(true)
    
    const { error } = await supabase
      .from('products')
      .insert({ name })

    setLoading(false)

    if (error) {
      alert(`Error: ${error.message}`)
    } else {
      setName('')
      alert('Product added successfully!')
    }
  }

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Add Product</h1>

      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={handleNameChange} 
          disabled={loading}
        />
      </div>

      <button 
        onClick={addProduct} 
        disabled={loading}
      >
        {loading ? 'Adding...' : 'Add'}
      </button>
    </div>
  )
}