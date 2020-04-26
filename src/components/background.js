import React, { useLayoutEffect, useState } from "react"
import BackgroundElement from "./backgroundElement"

import style from "./background.module.css"

const Background = ({ items }) => {
  useLayoutEffect(() => setPositions(), [])
  const [browser, setBrowser] = useState(false)

  function setPositions() {
    /* Server side rendering bypass, only calculate positions at useLayoutEffect */
    elementProps[0].position = [Math.max(window.innerWidth/2) + getRandomIntAround(110), Math.max(window.innerHeight/2) - getRandomIntAround(50)]
    elementProps[1].position = [Math.max(window.innerWidth/2) - getRandomIntAround(200), Math.max(window.innerHeight/2) + getRandomIntAround(100)]
    elementProps[2].position = [Math.max(window.innerWidth/2) - getRandomIntAround(400), Math.max(window.innerHeight/2) + getRandomIntAround(250)]
    elementProps[3].position = [Math.max(window.innerWidth/2) + getRandomIntAround(300), Math.max(window.innerHeight/2) - getRandomIntAround(150)]
    elementProps[4].position = [Math.max(window.innerWidth/2) - getRandomIntAround(550), Math.max(window.innerHeight/2) + getRandomIntAround(450)]
    elementProps[5].position = [Math.max(window.innerWidth/2) + getRandomIntAround(550), Math.max(window.innerHeight/2) - getRandomIntAround(250)]
    elementProps[6].position = [Math.max(window.innerWidth/2), Math.max(window.innerHeight)/2]
    setBrowser(true)
  }

  return (
    <svg id="background" className={style.background}>
      {console.log(elementProps)}
      {!browser ? null : <BackgroundElement id="extra" element={elementProps[0]}></BackgroundElement>}
      {!browser ? null : <BackgroundElement id="extwo" element={elementProps[1]}></BackgroundElement>}
      {!browser ? null : <BackgroundElement id="exthree" element={elementProps[2]}></BackgroundElement>}
      {!browser ? null : <BackgroundElement id="exfour" element={elementProps[3]}></BackgroundElement>}
      {!browser ? null : <BackgroundElement id="exfive" element={elementProps[4]}></BackgroundElement>}
      {!browser ? null : <BackgroundElement id="exsix" element={elementProps[5]}></BackgroundElement>}
      {!browser ? null : <BackgroundElement id="exseven" element={elementProps[6]}></BackgroundElement>}
    </svg>
  )
}

let elementProps = []

elementProps[0] = {
  rotation: getRandomIntAround(80),
  width: getRandomIntAround(10),
  dasharray: getRandomIntAround(100),
  frequency: getRandomIntAround(100),
  amplitude: getRandomIntAround(60),
  gridDistance: getRandomIntAround(0),
  offset: getRandomIntAround(7),
  gridSize: getRandomIntAround(1),
  totalWidth: getRandomIntAround(200)
}

elementProps[1] = {
  rotation: getRandomIntAround(-10),
  width: getRandomIntAround(1),
  dasharray: getRandomIntAround(100),
  frequency: getRandomIntAround(10),
  amplitude: getRandomIntAround(15),
  gridDistance: getRandomIntAround(10),
  offset: getRandomIntAround(12),
  gridSize: getRandomIntAround(10),
  totalWidth: getRandomIntAround(200)
}

elementProps[2] = {
  rotation: getRandomIntAround(20),
  width: getRandomIntAround(1),
  dasharray: getRandomIntAround(100),
  frequency: getRandomIntAround(2),
  amplitude: getRandomIntAround(15),
  gridDistance: getRandomIntAround(10),
  offset: getRandomIntAround(200),
  gridSize: getRandomIntAround(7),
  totalWidth: getRandomIntAround(240)
}

elementProps[3] = {
  rotation: getRandomIntAround(30),
  width: getRandomIntAround(2),
  dasharray: getRandomIntAround(80),
  frequency: getRandomIntAround(20),
  amplitude: getRandomIntAround(60),
  gridDistance: getRandomIntAround(100),
  offset: getRandomIntAround(12),
  gridSize: getRandomIntAround(7),
  totalWidth: getRandomIntAround(200)
}

elementProps[4] = {
  rotation: getRandomIntAround(-180),
  width: getRandomIntAround(8),
  dasharray: getRandomIntAround(10),
  frequency: getRandomIntAround(120),
  amplitude: getRandomIntAround(20),
  gridDistance: getRandomIntAround(0),
  offset: getRandomIntAround(7),
  gridSize: getRandomIntAround(2),
  totalWidth: getRandomIntAround(240)
}

elementProps[5] = {
  rotation: getRandomIntAround(-130),
  width: getRandomIntAround(2),
  dasharray: getRandomIntAround(10),
  frequency: getRandomIntAround(20),
  amplitude: getRandomIntAround(10),
  gridDistance: getRandomIntAround(0),
  offset: getRandomIntAround(7),
  gridSize: getRandomIntAround(10),
  totalWidth: getRandomIntAround(180)
}

elementProps[6] = {
  rotation: getRandomIntAround(-45),
  width: getRandomIntAround(1),
  dasharray: getRandomIntAround(10),
  frequency: getRandomIntAround(10),
  amplitude: getRandomIntAround(20),
  gridDistance: getRandomIntAround(10),
  offset: getRandomIntAround(1),
  gridSize: getRandomIntAround(6),
  totalWidth: getRandomIntAround(200)
}

function getRandomIntAround(value) {
  //console.log(value)
  let min = Math.ceil(value * 0.5);
  let max = Math.floor(value * 1.5);
  //console.log(Math.floor(Math.random() * (max - min + 1)) + min)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

Background.propTypes = {
  
}

Background.defaultProps = {

}

export default Background
