import React, { ReactNode } from 'react'

interface CardProps {
  children: ReactNode;
}




function Card({
    children,
}: CardProps) {
  return (
    <div className=' border-2 rounded-4xl bg-accent'>{children}</div>
  )
}

export default Card