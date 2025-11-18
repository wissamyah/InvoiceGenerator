import { createContext, useContext, useState } from 'react'
import Modal from '../components/Modal'

const ModalContext = createContext()

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: null
  })

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }))
  }

  const showAlert = (title, message, type = 'alert') => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: null
    })
  }

  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        onConfirm: () => {
          closeModal()
          resolve(true)
        }
      })
    })
  }

  const handleClose = () => {
    if (modal.type === 'confirm' && modal.onConfirm) {
      // User cancelled the confirm dialog
      closeModal()
    } else {
      closeModal()
    }
  }

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Modal
        isOpen={modal.isOpen}
        onClose={handleClose}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </ModalContext.Provider>
  )
}

