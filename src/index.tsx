import React, { useState, useEffect, useRef } from 'react'
import { type FC } from 'react'
import { Retool } from '@tryretool/custom-component-support'

// Type definitions
interface Character {
  id: string
  name: string
  profilePicture?: string
  statusText: string
  personalityTags?: string[]
  filterTags?: string[]
  age?: number
}

interface Message {
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface UserChat {
  characterId: string
  characterName: string
  characterAvatar?: string
  conversationId: string
  lastMessage?: string
  lastMessageTime?: string
}

export const WhispiChatInterface: FC = () => {
  // Retool props
  const [apiBaseUrl] = Retool.useStateString({
    name: 'apiBaseUrl',
    initialValue: 'https://us-central1-whispi-e61fa.cloudfunctions.net'
  })

  // State management
  const [currentUID, setCurrentUID] = useState<string | null>(null)
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(
    null
  )
  const [_currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([])
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [userChats, setUserChats] = useState<UserChat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [showAnonymousModal, setShowAnonymousModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [uidInput, setUidInput] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [accountCreationStatus, setAccountCreationStatus] = useState('')
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [showChatInterface, setShowChatInterface] = useState(false)
  const [typingIndicator, setTypingIndicator] = useState(false)
  const [error, setError] = useState('')

  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  // Filter tags
  const FILTER_TAGS = [
    'Realistic',
    'Anime',
    'Fantasy',
    'Sci-Fi',
    'Modern',
    'Friendly',
    'Mysterious',
    'Romantic',
    'Playful',
    'Serious',
    'Funny',
    'Intellectual',
    'Adventurous',
    'Caring',
    'Young Adult',
    'Mature',
    'MILF',
    'Girlfriend',
    'Boyfriend',
    'Teacher',
    'Student',
    'Asian',
    'European',
    'Slim',
    'Curvy'
  ]

  // Initialize component
  useEffect(() => {
    const savedUID = localStorage.getItem('whispi_uid')
    if (savedUID) {
      setUidInput(savedUID)
      handleSetCurrentUID(savedUID)
    }
  }, [])

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [messages])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const generateDeviceId = () => {
    const existingDeviceId = localStorage.getItem('whispi_device_id')
    if (existingDeviceId) {
      return existingDeviceId
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      (navigator as { deviceMemory?: number }).deviceMemory || 'unknown'
    ].join('|')

    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }

    const deviceId = 'device_' + Math.abs(hash).toString(36)
    localStorage.setItem('whispi_device_id', deviceId)
    return deviceId
  }

  const handleSetCurrentUID = (uid: string) => {
    setCurrentUID(uid)
    localStorage.setItem('whispi_uid', uid)
    loadUserChats(uid)
  }

  const loadUserChats = async (uid: string) => {
    if (!uid) {
      setError(
        "Varsa sahip olduğunuz UID'yi giriniz. UID'niz yoksa yeni hesap açabilirsiniz."
      )
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/getUserChats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { uid } })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to get user chats')
      }

      setUserChats(result.result.conversations || [])
    } catch (error: unknown) {
      console.error('Error loading user chats:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('empty')
      ) {
        setUserChats([])
      } else {
        setError('Sohbetler yüklenirken hata oluştu: ' + errorMessage)
      }
    }
  }

  const createAnonymousAccount = async () => {
    if (!displayName.trim()) {
      setAccountCreationStatus('Lütfen adınızı girin.')
      return
    }

    const birthYearNum = parseInt(birthYear)
    if (!birthYearNum || birthYearNum < 1900 || birthYearNum > 2025) {
      setAccountCreationStatus('Lütfen geçerli bir doğum yılı girin.')
      return
    }

    setIsCreatingAccount(true)
    setAccountCreationStatus('Anonim hesap oluşturuluyor...')

    try {
      // Create anonymous user
      const createUserResponse = await fetch(
        `${apiBaseUrl}/createAnonymousUser`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: {} })
        }
      )

      const createUserResult = await createUserResponse.json()
      if (!createUserResponse.ok) {
        throw new Error(
          createUserResult.error?.message || 'Failed to create anonymous user'
        )
      }

      const uid = createUserResult.result.uid

      // Onboard user
      setAccountCreationStatus('Hesap ayarları yapılıyor...')
      const deviceId = generateDeviceId()

      const onboardResponse = await fetch(`${apiBaseUrl}/onboardUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            uid,
            deviceId,
            displayName,
            birthYear: birthYearNum
          }
        })
      })

      const onboardResult = await onboardResponse.json()
      if (!onboardResponse.ok) {
        throw new Error(
          onboardResult.error?.message || 'Failed to onboard user'
        )
      }

      // Save UID and set as current user
      localStorage.setItem('whispi_uid', uid)
      setUidInput(uid)
      handleSetCurrentUID(uid)

      setAccountCreationStatus('Hesap başarıyla oluşturuldu!')
      setTimeout(() => {
        setShowAnonymousModal(false)
        setDisplayName('')
        setBirthYear('')
        setAccountCreationStatus('')
      }, 2000)
    } catch (error: unknown) {
      console.error('Error creating anonymous account:', error)
      setAccountCreationStatus(
        'Hesap oluşturulurken hata oluştu: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const loadCharactersForModal = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/listCharacters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            limit: 20,
            filteredTags: [],
            prefetchMode: false
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to list characters')
      }

      setCharacters(result.result.characters || [])
      setFilteredCharacters(result.result.characters || [])
    } catch (error: unknown) {
      console.error('Error loading characters:', error)
      setError(
        'Karakterler yüklenirken hata oluştu: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  }

  const filterCharacters = () => {
    const filtered = characters.filter((character) => {
      const matchesSearch =
        !searchTerm ||
        character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        character.statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (character.personalityTags &&
          character.personalityTags.some((tag: string) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          ))

      const matchesFilters =
        activeFilters.length === 0 ||
        (character.filterTags &&
          activeFilters.every((filter) =>
            character.filterTags?.includes(filter)
          ))

      return matchesSearch && matchesFilters
    })

    setFilteredCharacters(filtered)
  }

  useEffect(() => {
    filterCharacters()
  }, [searchTerm, activeFilters, characters])

  const toggleFilter = (tag: string) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const selectCharacter = async (character: Character) => {
    try {
      const response = await fetch(`${apiBaseUrl}/newChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            characterId: character.id,
            uid: currentUID
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create new chat')
      }

      const chatData = result.result
      setCurrentCharacter(character)
      setCurrentConversationId(chatData.conversationId)
      setShowCharacterModal(false)

      if (!chatData.isNewConversation && chatData.messageCount > 0) {
        await loadChatHistory(character.id)
      } else {
        setMessages([])
      }

      setShowChatInterface(true)
      loadUserChats(currentUID!)
    } catch (error: unknown) {
      console.error('Error selecting character:', error)
      setError(
        'Karakter seçilirken hata oluştu: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  }

  const openExistingChat = async (chat: UserChat) => {
    setCurrentCharacter({
      id: chat.characterId,
      name: chat.characterName,
      profilePicture: chat.characterAvatar,
      statusText: 'Çevrimiçi'
    })
    setCurrentConversationId(chat.conversationId)
    await loadChatHistory(chat.characterId)
    setShowChatInterface(true)
  }

  const loadChatHistory = async (characterId: string) => {
    if (!currentUID || !characterId) return

    try {
      const response = await fetch(`${apiBaseUrl}/getChatHistory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            characterId,
            uid: currentUID,
            limit: 50
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to get chat history')
      }

      const historyMessages = result.result.messages || []
      setMessages(
        historyMessages.map(
          (msg: {
            content: string
            role: 'user' | 'assistant'
            timestamp: string
          }) => ({
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.timestamp)
          })
        )
      )
    } catch (error: unknown) {
      console.error('Error loading chat history:', error)
    }
  }

  const sendMessage = async () => {
    if (isStreaming || !messageInput.trim() || !currentCharacter || !currentUID)
      return

    const message = messageInput.trim()
    setMessages((prev) => [
      ...prev,
      {
        content: message,
        role: 'user',
        timestamp: new Date()
      }
    ])
    setMessageInput('')
    setTypingIndicator(true)
    setIsStreaming(true)

    try {
      const response = await fetch(
        `${apiBaseUrl}/chatApi/chatStream?uid=${currentUID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUID}`
          },
          body: JSON.stringify({
            prompt: message,
            characterId: currentCharacter.id,
            uid: currentUID
          })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      setTypingIndicator(false)
      let fullResponse = ''
      let messageIndex = -1

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data.trim() === '') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'chunk') {
                if (messageIndex === -1) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      content: '',
                      role: 'assistant',
                      timestamp: new Date()
                    }
                  ])
                  messageIndex = messages.length
                }
                fullResponse += parsed.content
                setMessages((prev) => {
                  const newMessages = [...prev]
                  if (newMessages[newMessages.length - 1]) {
                    newMessages[newMessages.length - 1].content = fullResponse
                  }
                  return newMessages
                })
              } else if (parsed.type === 'complete') {
                fullResponse = parsed.content
                setMessages((prev) => {
                  const newMessages = [...prev]
                  if (newMessages[newMessages.length - 1]) {
                    newMessages[newMessages.length - 1].content = fullResponse
                  }
                  return newMessages
                })
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message)
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
            }
          }
        }
      }

      loadUserChats(currentUID)
    } catch (error: unknown) {
      console.error('Error sending message:', error)
      setError(
        'Mesaj gönderilirken hata oluştu: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setTypingIndicator(false)
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openCharacterModal = () => {
    if (!currentUID) {
      setError('Lütfen önce UID giriniz veya anonim hesap oluşturunuz.')
      return
    }
    setShowCharacterModal(true)
    loadCharactersForModal()
  }

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        background: '#f0f2f5',
        height: '125vh',
        width: '125vw',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        transform: 'scale(0.8)',
        transformOrigin: 'center center',
        position: 'fixed',
        top: '50%',
        left: '50%',
        marginTop: '-62.5vh',
        marginLeft: '-62.5vw'
      }}
    >
      <div style={{ display: 'flex', height: '125vh', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '360px',
            background: 'white',
            borderRight: '1px solid #e9edef',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Sidebar Header */}
          <div
            style={{
              padding: '20px',
              background: '#00a884',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h2 style={{ fontSize: '19px', fontWeight: 500, margin: 0 }}>
              Whispi Chat
            </h2>
            <button
              onClick={openCharacterModal}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Yeni Chat
            </button>
          </div>

          {/* User Section */}
          <div
            style={{
              padding: '15px 20px',
              borderBottom: '1px solid #e9edef',
              background: '#f8f9fa'
            }}
          >
            <input
              type="text"
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              onBlur={(e) =>
                e.target.value.trim() &&
                handleSetCurrentUID(e.target.value.trim())
              }
              placeholder="Sahip olduğunuz UID'yi girin veya yeni hesap açın."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d7db',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            />
            <button
              onClick={() => setShowAnonymousModal(true)}
              style={{
                background: '#00a884',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%'
              }}
            >
              Anonim Hesap Oluştur
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div
              style={{
                background: '#ffebee',
                color: '#c62828',
                padding: '15px',
                margin: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {error}
            </div>
          )}

          {/* Chat List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 0
            }}
          >
            {userChats.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#667781'
                }}
              >
                <div
                  style={{
                    fontSize: '60px',
                    marginBottom: '20px',
                    opacity: 0.5
                  }}
                >
                  💬
                </div>
                <h3>Henüz hiç sohbetiniz yok</h3>
                <p>Yeni Chat butonuna tıklayarak başlayın</p>
              </div>
            ) : (
              userChats.map((chat, index) => (
                <div
                  key={index}
                  onClick={() => openExistingChat(chat)}
                  style={{
                    display: 'flex',
                    padding: '15px 20px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    alignItems: 'center',
                    transition: 'background-color 0.2s',
                    backgroundColor:
                      currentCharacter?.id === chat.characterId
                        ? '#e7f3ff'
                        : 'transparent'
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = '#f5f6f6')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      currentCharacter?.id === chat.characterId
                        ? '#e7f3ff'
                        : 'transparent')
                  }
                >
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      marginRight: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f0f0f0',
                      fontSize: '24px'
                    }}
                  >
                    {chat.characterAvatar ? (
                      <img
                        src={chat.characterAvatar}
                        alt={chat.characterName}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = '🧑‍💼'
                        }}
                      />
                    ) : (
                      '🧑‍💼'
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '16px',
                        marginBottom: '4px'
                      }}
                    >
                      {chat.characterName}
                    </div>
                    <div
                      style={{
                        color: '#667781',
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {chat.lastMessage || 'Yeni sohbet'}
                    </div>
                  </div>
                  <div
                    style={{
                      color: '#667781',
                      fontSize: '12px'
                    }}
                  >
                    {chat.lastMessageTime
                      ? new Date(chat.lastMessageTime).toLocaleTimeString(
                          'tr-TR',
                          {
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )
                      : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#efeae2',
            height: '125vh',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {!showChatInterface ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#667781',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>💬</div>
              <h2>Whispi Chat&apos;e Hoş Geldiniz</h2>
              <p>Bir sohbet seçin veya yeni chat başlatın</p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '125vh',
                overflow: 'hidden'
              }}
            >
              {/* Chat Header */}
              <div
                style={{
                  background: 'white',
                  padding: '15px 20px',
                  borderBottom: '1px solid #e9edef',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    marginRight: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0f0f0',
                    fontSize: '20px'
                  }}
                >
                  {currentCharacter?.profilePicture ? (
                    <img
                      src={currentCharacter.profilePicture}
                      alt={currentCharacter.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement!.innerHTML = '🧑‍💼'
                      }}
                    />
                  ) : (
                    '🧑‍💼'
                  )}
                </div>
                <div>
                  <h3
                    style={{ fontSize: '16px', marginBottom: '2px', margin: 0 }}
                  >
                    {currentCharacter?.name}
                  </h3>
                  <div style={{ color: '#667781', fontSize: '13px' }}>
                    {currentCharacter?.statusText}
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div
                ref={chatMessagesRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  paddingBottom: '20px',
                  background:
                    'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="%23e9edef" opacity="0.5"/></pattern></defs><rect x="0" y="0" width="100" height="100" fill="url(%23pattern)"/></svg>\')',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent:
                        message.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '65%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        position: 'relative',
                        wordWrap: 'break-word',
                        background:
                          message.role === 'user' ? '#d9fdd3' : 'white',
                        marginLeft: message.role === 'user' ? 'auto' : '0',
                        marginRight: message.role === 'user' ? '0' : 'auto'
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#667781',
                          marginTop: '2px',
                          textAlign: message.role === 'user' ? 'right' : 'left'
                        }}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}

                {typingIndicator && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      maxWidth: '65%'
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#667781' }}>
                      {currentCharacter?.name} yazıyor
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        marginLeft: '10px'
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: '6px',
                            height: '6px',
                            background: '#667781',
                            borderRadius: '50%',
                            animation: `typing 1.4s infinite ease-in-out ${-0.32 + i * 0.16}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div
                style={{
                  background: 'white',
                  padding: '15px 20px',
                  borderTop: '1px solid #e9edef',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '10px',
                  flexShrink: 0,
                  marginTop: 'auto',
                  width: '100%'
                }}
              >
                <textarea
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 100) + 'px'
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Mesajınızı yazın..."
                  rows={1}
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    border: '1px solid #d1d7db',
                    borderRadius: '25px',
                    fontSize: '15px',
                    outline: 'none',
                    resize: 'none',
                    maxHeight: '100px',
                    minHeight: '40px',
                    lineHeight: 1.4,
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isStreaming || !messageInput.trim()}
                  style={{
                    background:
                      isStreaming || !messageInput.trim()
                        ? '#d1d7db'
                        : '#00a884',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    cursor:
                      isStreaming || !messageInput.trim()
                        ? 'not-allowed'
                        : 'pointer',
                    fontSize: '14px',
                    minWidth: '80px',
                    height: '40px'
                  }}
                >
                  Gönder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Character Selection Modal */}
      {showCharacterModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCharacterModal(false)
              setActiveFilters([])
              setSearchTerm('')
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px',
                background: '#00a884',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>
                Karakter Seçin
              </h3>
              <button
                onClick={() => {
                  setShowCharacterModal(false)
                  setActiveFilters([])
                  setSearchTerm('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #e9edef'
              }}
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Karakter ara..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d7db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Filter Tags */}
            <div
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e9edef',
                maxHeight: '120px',
                overflowY: 'auto'
              }}
            >
              {FILTER_TAGS.map((tag) => (
                <span
                  key={tag}
                  onClick={() => toggleFilter(tag)}
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    margin: '2px',
                    background: activeFilters.includes(tag)
                      ? '#00a884'
                      : '#e9edef',
                    color: activeFilters.includes(tag) ? 'white' : 'inherit',
                    borderRadius: '12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Character List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 0
              }}
            >
              {filteredCharacters.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#667781'
                  }}
                >
                  Karakter bulunamadı
                </div>
              ) : (
                filteredCharacters.map((character, index) => (
                  <div
                    key={index}
                    onClick={() => selectCharacter(character)}
                    style={{
                      display: 'flex',
                      padding: '15px 20px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                      alignItems: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#f5f6f6')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        marginRight: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f0f0f0',
                        fontSize: '24px'
                      }}
                    >
                      {character.profilePicture ? (
                        <img
                          src={character.profilePicture}
                          alt={character.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.innerHTML = '🧑‍💼'
                          }}
                        />
                      ) : (
                        '🧑‍💼'
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '16px',
                          marginBottom: '4px'
                        }}
                      >
                        {character.name}
                      </div>
                      <div
                        style={{
                          color: '#667781',
                          fontSize: '14px',
                          marginBottom: '4px'
                        }}
                      >
                        {character.statusText}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px'
                        }}
                      >
                        {(character.personalityTags || [])
                          .slice(0, 3)
                          .map((tag: string, tagIndex: number) => (
                            <span
                              key={tagIndex}
                              style={{
                                background: '#e9edef',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: '#667781'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        {character.age && (
                          <span
                            style={{
                              background: '#e9edef',
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              color: '#667781'
                            }}
                          >
                            {character.age} yaş
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Anonymous Account Modal */}
      {showAnonymousModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAnonymousModal(false)
              setDisplayName('')
              setBirthYear('')
              setAccountCreationStatus('')
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px',
                background: '#00a884',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>
                Anonim Hesap Oluştur
              </h3>
              <button
                onClick={() => {
                  setShowAnonymousModal(false)
                  setDisplayName('')
                  setBirthYear('')
                  setAccountCreationStatus('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: '20px' }}>
              <div style={{ padding: '10px 0' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 500
                  }}
                >
                  Ad:
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Adınızı girin..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d7db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    marginBottom: '15px'
                  }}
                />

                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 500
                  }}
                >
                  Doğum Yılı:
                </label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="Doğum yılınızı girin..."
                  min="1900"
                  max="2025"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d7db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <button
                onClick={createAnonymousAccount}
                disabled={isCreatingAccount}
                style={{
                  background: isCreatingAccount ? '#d1d7db' : '#00a884',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  cursor: isCreatingAccount ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  width: '200px',
                  margin: '0 auto',
                  display: 'block'
                }}
              >
                {isCreatingAccount ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
              </button>
              {accountCreationStatus && (
                <div
                  style={{
                    marginTop: '15px',
                    fontSize: '14px',
                    color: accountCreationStatus.includes('hata')
                      ? '#c62828'
                      : accountCreationStatus.includes('başarıyla')
                        ? '#00a884'
                        : '#667781'
                  }}
                >
                  {accountCreationStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes typing {
          0%,
          80%,
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
