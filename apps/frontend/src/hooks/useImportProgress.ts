'use client'

import { useEffect, useState } from 'react'
import { joinImportRoom, leaveImportRoom, getSocket, connectSocket } from '@/lib/socket'

interface ProgressData {
  status: string
  progresso: number
  etapaAtual: string
  totalArquivos: number
  processados: number
  erros: number
  arquivoAtual?: string
  mensagem?: string
}

export function useImportProgress(importacaoId: string | null) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [completed, setCompleted] = useState<any>(null)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!importacaoId) return

    const socket = connectSocket()
    joinImportRoom(importacaoId)

    socket.on('progress', (data: ProgressData) => setProgress(data))
    socket.on('completed', (data: any) => setCompleted(data))
    socket.on('error', (data: any) => setError(data))

    return () => {
      leaveImportRoom(importacaoId)
      socket.off('progress')
      socket.off('completed')
      socket.off('error')
    }
  }, [importacaoId])

  return { progress, completed, error }
}
