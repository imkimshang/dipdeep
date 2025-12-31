'use client'

import { useEffect, useRef, useState } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
}

export function InteractiveHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const nodesRef = useRef<Node[]>([])
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas 크기 설정
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      
      // 노드 초기화 (화면 크기가 변경되면 재생성)
      if (nodesRef.current.length === 0) {
        initNodes()
      }
    }
    
    // 노드 초기화 함수
    const initNodes = () => {
      const nodeCount = Math.floor((canvas.width * canvas.height) / 15000) // 화면 크기에 비례
      nodesRef.current = []
      
      for (let i = 0; i < nodeCount; i++) {
        nodesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        })
      }
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 마우스 이동 이벤트
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX,
        y: e.clientY,
      })
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // 두 점 사이의 거리 계산
    const distance = (x1: number, y1: number, x2: number, y2: number) => {
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    }

    // 노드 그리기 함수
    const drawNodes = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const nodes = nodesRef.current
      const connectionDistance = 120 // 연결되는 최대 거리
      const mouseInfluenceRadius = 150 // 마우스 영향 반경

      // 노드 위치 업데이트 및 마우스 영향 적용
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        
        // 기본 움직임
        node.x += node.vx
        node.y += node.vy

        // 경계 처리
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1
        node.x = Math.max(0, Math.min(canvas.width, node.x))
        node.y = Math.max(0, Math.min(canvas.height, node.y))

        // 마우스 커서에 미세하게 반응
        const distToMouse = distance(node.x, node.y, mousePos.x, mousePos.y)
        if (distToMouse < mouseInfluenceRadius) {
          const angle = Math.atan2(mousePos.y - node.y, mousePos.x - node.x)
          const force = (1 - distToMouse / mouseInfluenceRadius) * 0.5
          node.x -= Math.cos(angle) * force
          node.y -= Math.sin(angle) * force
        }
      }

      // 연결선 그리기
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = distance(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)
          
          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * 0.35 // 더 진하게
            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // 노드 그리기
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        ctx.fillStyle = 'rgba(99, 102, 241, 0.5)' // 투명도 증가
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2.25, 0, Math.PI * 2) // 1.5배 크게 (1.5 * 1.5 = 2.25)
        ctx.fill()
      }

      animationFrameRef.current = requestAnimationFrame(drawNodes)
    }

    drawNodes()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [mousePos])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  )
}
