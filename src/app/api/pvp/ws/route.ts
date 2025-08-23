// WebSocket connections storage
const connections = new Map<string, WebSocket>()

export async function GET(request: any) {
  try {
    // WebSocket upgrade handling
    const { socket, response } = await request.socket as any
    
    if (!socket) {
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    // Connection handling
    socket.on('message', (data: string) => {
      try {
        const message = JSON.parse(data)
        handleWebSocketMessage(socket, message)
      } catch (error) {
        console.error('[WebSocket] Message parsing error:', error)
      }
    })

    socket.on('close', () => {
      // Connection cleanup
      const connectionId = Array.from(connections.entries())
        .find(([_, ws]) => ws === socket)?.[0]
      if (connectionId) {
        connections.delete(connectionId)
        console.log(`[WebSocket] Connection closed: ${connectionId}`)
      }
    })

    socket.on('error', (error: Error) => {
      console.error('[WebSocket] Socket error:', error)
    })

    return response
  } catch (error) {
    console.error('[WebSocket] Setup error:', error)
    return new Response('WebSocket setup failed', { status: 500 })
  }
}

function handleWebSocketMessage(socket: WebSocket, message: any) {
  switch (message.type) {
    case 'JOIN_QUEUE':
      handleJoinQueue(socket, message)
      break
    case 'LEAVE_QUEUE':
      handleLeaveQueue(socket, message)
      break
    case 'FIND_MATCH':
      handleFindMatch(socket, message)
      break
    default:
      console.warn('[WebSocket] Unknown message type:', message.type)
  }
}

function handleJoinQueue(socket: WebSocket, message: any) {
  const { playerFid, playerName, playerAvatar } = message
  const connectionId = `${playerFid}-${Date.now()}`
  
  connections.set(connectionId, socket)
  
  // Success response
  socket.send(JSON.stringify({
    type: 'QUEUE_JOINED',
    connectionId,
    message: 'Successfully joined matchmaking queue'
  }))
  
  console.log(`[WebSocket] Player ${playerFid} joined queue`)
}

function handleLeaveQueue(socket: WebSocket, message: any) {
  const { connectionId } = message
  
  if (connectionId && connections.has(connectionId)) {
    connections.delete(connectionId)
    socket.send(JSON.stringify({
      type: 'QUEUE_LEFT',
      message: 'Successfully left matchmaking queue'
    }))
    
    console.log(`[WebSocket] Connection ${connectionId} left queue`)
  }
}

function handleFindMatch(socket: WebSocket, message: any) {
  const { playerFid, playerSkill } = message
  
  // Skill-based matching logic
  // Simple random matching for now
  
  const availableConnections = Array.from(connections.entries())
    .filter(([id, ws]) => !id.startsWith(playerFid.toString()))
  
  if (availableConnections.length > 0) {
    const [opponentId, opponentSocket] = availableConnections[0]
    
    // Send match notification to both players
    socket.send(JSON.stringify({
      type: 'MATCH_FOUND',
      opponent: {
        connectionId: opponentId,
        playerSkill: playerSkill || 1000
      }
    }))
    
    opponentSocket.send(JSON.stringify({
      type: 'MATCH_FOUND',
      opponent: {
        connectionId: `${playerFid}-${Date.now()}`,
        playerSkill: playerSkill || 1000
      }
    }))
    
    console.log(`[WebSocket] Match found between ${playerFid} and ${opponentId}`)
  } else {
    socket.send(JSON.stringify({
      type: 'NO_MATCH_FOUND',
      message: 'No opponents available at the moment'
    }))
  }
}

// Export connections Map for other API endpoints
export { connections }
