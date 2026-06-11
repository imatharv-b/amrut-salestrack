import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ChatWindow() {
  const { profile, isManager, isSalesman } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [salesmen, setSalesmen] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!profile) return

    if (isManager) {
      supabase.from('users').select('id, name').eq('role', 'salesman').order('name')
        .then(({ data }) => {
          setSalesmen([{ id: 'broadcast', name: '📢 Broadcast to All (Managers & Salesmen)' }, ...(data || [])])
        })
    } else if (isSalesman) {
      supabase.from('users').select('id, name').eq('role', 'manager').limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSelectedUser(data[0])
          }
        })
    }
  }, [profile, isManager, isSalesman])

  useEffect(() => {
    if (!isOpen || !selectedUser || !profile) return

    let isMounted = true

    const fetchMessages = async () => {
      setLoading(true)
      const query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true })
      
      if (selectedUser.id === 'broadcast') {
        query.is('receiver_id', null).eq('sender_id', profile.id)
      } else {
        query.or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${profile.id})`)
      }

      const { data } = await query
      
      if (isMounted) {
        setMessages(data || [])
        setLoading(false)
        scrollToBottom()
      }
    }

    fetchMessages()

    if (selectedUser.id === 'broadcast') return // No realtime needed for manager's own broadcasts

    const channel = supabase.channel(`chat_${profile.id}_${selectedUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${profile.id}`
      }, (payload) => {
        if (payload.new.sender_id === selectedUser.id) {
          setMessages(prev => [...prev, payload.new])
          scrollToBottom()
        }
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [isOpen, selectedUser, profile])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || !profile) return

    const msg = {
      sender_id: profile.id,
      receiver_id: selectedUser.id === 'broadcast' ? null : selectedUser.id,
      message: newMessage.trim(),
      created_at: new Date().toISOString()
    }

    const tempId = Date.now()
    setMessages(prev => [...prev, { ...msg, id: tempId }])
    setNewMessage('')
    scrollToBottom()

    try {
      const { data, error } = await supabase.from('chat_messages').insert(msg).select().single()
      if (error) throw error
      // Replace temp message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    } catch (err) {
      console.error('Failed to send message:', err)
      // Revert optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }

  if (!profile) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 w-14 h-14 bg-brand-600 text-white rounded-full shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] flex items-center justify-center hover:bg-brand-700 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] transition-all hover:scale-105 z-40"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full md:w-[400px] h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
            
            <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md z-10">
              <div className="flex items-center gap-3">
                {isManager && selectedUser && (
                  <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-white/20 rounded-full transition active:scale-95">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                <div className="font-bold text-lg leading-tight">
                  {isManager ? (selectedUser ? selectedUser.name : 'Select Chat') : 'Manager Support'}
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition active:scale-95">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
              {isManager && !selectedUser ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Start a conversation</p>
                  {salesmen.map(sm => (
                    <button
                      key={sm.id}
                      onClick={() => setSelectedUser(sm)}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-brand-300 hover:shadow-md transition text-left active:scale-95"
                    >
                      <div className={`w-12 h-12 rounded-full ${sm.id === 'broadcast' ? 'bg-amber-100 text-amber-600' : 'bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600'} font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm border ${sm.id === 'broadcast' ? 'border-amber-200' : 'border-brand-200'}`}>
                        {sm.id === 'broadcast' ? '📢' : sm.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 text-base">{sm.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{sm.id === 'broadcast' ? 'Send a message to everyone' : 'Tap to open chat'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                      <div className="flex justify-center p-8">
                        <div className="w-8 h-8 border-[3px] border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in-up">
                        <span className="text-5xl mb-4">👋</span>
                        <p className="text-gray-800 font-bold mb-1">Say Hello!</p>
                        <p className="text-gray-500 text-sm max-w-[250px]">Send a message to start the conversation. Messages older than 48 hours are automatically deleted.</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMe = msg.sender_id === profile.id
                        return (
                          <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${isMe ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'}`}>
                              <p className="text-[15px] whitespace-pre-wrap break-words leading-snug">{msg.message}</p>
                              <p className={`text-[10px] font-medium mt-1.5 text-right ${isMe ? 'text-brand-100' : 'text-gray-400'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 bg-white border-t border-gray-200 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                    <form onSubmit={sendMessage} className="flex gap-2 items-end max-w-full">
                      <textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none max-h-32 text-[15px] transition-colors"
                        rows="1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(e);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-brand-700 active:scale-95 transition shadow-sm"
                      >
                        <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
