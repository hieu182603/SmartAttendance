import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'

function Home() {
  return (
    <div className="container py-4">
      <h1 className="mb-3">SmartAttendance</h1>
      <p className="text-muted">Welcome to the app scaffold.</p>
    </div>
  )
}

function About() {
  return (
    <div className="container py-4">
      <h2>About</h2>
      <p>React + Vite + Bootstrap</p>
    </div>
  )
}

export default function App() {
  return (
    <>
      <nav className="navbar navbar-expand bg-light">
        <div className="container">
          <Link className="navbar-brand" to="/">SmartAttendance</Link>
          <ul className="navbar-nav">
            <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/about">About</Link></li>
          </ul>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  )
}


