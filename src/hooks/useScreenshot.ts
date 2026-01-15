import { useState, useEffect } from 'react'

export const useScreenshot = () => {
  const [isCapturing, setIsCapturing] = useState(false)

  useEffect(() => {
    const handleStartScreenshot = () => {
      setIsCapturing(true)
    }

    window.ipcRenderer.on('start-screenshot', handleStartScreenshot)
    return () => {
      window.ipcRenderer.off('start-screenshot', handleStartScreenshot)
    }
  }, [])

  const stopCapture = () => setIsCapturing(false)

  return { isCapturing, stopCapture }
}
