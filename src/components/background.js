//import { Link } from "gatsby"
//import PropTypes from "prop-types"
import React from "react"
import BackgroundElement from "./backgroundElement"

import style from "./background.module.css"

const Background = ({ items }) => (
  <svg id="background" className={style.background}>
    <BackgroundElement id="extra" element={elementProps}></BackgroundElement>
    <BackgroundElement id="extwo" element={elementProps2}></BackgroundElement>
    <BackgroundElement id="exthree" element={elementProps3}></BackgroundElement>
    <BackgroundElement id="exfour" element={elementProps4}></BackgroundElement>
    <BackgroundElement id="exfive" element={elementProps5}></BackgroundElement>
    <BackgroundElement id="exsix" element={elementProps6}></BackgroundElement>
    <BackgroundElement id="exseven" element={elementProps7}></BackgroundElement>
  </svg>
)

let elementProps = {
  rotation: getRandomIntAround(80),
  width: getRandomIntAround(10),
  dasharray: getRandomIntAround(100),
  frequency: getRandomIntAround(100),
  amplitude: getRandomIntAround(60),
  gridDistance: getRandomIntAround(0),
  offset: getRandomIntAround(7),
  gridSize: getRandomIntAround(1),
  totalWidth: getRandomIntAround(200),
  position: [Math.max(window.innerWidth/2) + getRandomIntAround(110), Math.max(window.innerHeight/2) - getRandomIntAround(50)]
}

let elementProps2 = {
  rotation: getRandomIntAround(-10),
  width: getRandomIntAround(1),
  dasharray: getRandomIntAround(100),
  frequency: getRandomIntAround(10),
  amplitude: getRandomIntAround(15),
  gridDistance: getRandomIntAround(10),
  offset: getRandomIntAround(12),
  gridSize: getRandomIntAround(10),
  totalWidth: getRandomIntAround(200),
  position: [Math.max(window.innerWidth/2) - getRandomIntAround(200), Math.max(window.innerHeight/2) + getRandomIntAround(100)]
}

let elementProps3 = {
  rotation: getRandomIntAround(20),
  width: getRandomIntAround(1),
  dasharray: getRandomIntAround(100),
  frequency: getRandomIntAround(2),
  amplitude: getRandomIntAround(15),
  gridDistance: getRandomIntAround(10),
  offset: getRandomIntAround(200),
  gridSize: getRandomIntAround(7),
  totalWidth: getRandomIntAround(240),
  position: [Math.max(window.innerWidth/2) - getRandomIntAround(400), Math.max(window.innerHeight/2) + getRandomIntAround(250)]
}

let elementProps4 = {
  rotation: getRandomIntAround(30),
  width: getRandomIntAround(2),
  dasharray: getRandomIntAround(80),
  frequency: getRandomIntAround(20),
  amplitude: getRandomIntAround(60),
  gridDistance: getRandomIntAround(100),
  offset: getRandomIntAround(12),
  gridSize: getRandomIntAround(7),
  totalWidth: getRandomIntAround(200),
  position: [Math.max(window.innerWidth/2) + getRandomIntAround(300), Math.max(window.innerHeight/2) - getRandomIntAround(150)]
}

let elementProps5 = {
  rotation: getRandomIntAround(-180),
  width: getRandomIntAround(8),
  dasharray: getRandomIntAround(10),
  frequency: getRandomIntAround(120),
  amplitude: getRandomIntAround(20),
  gridDistance: getRandomIntAround(0),
  offset: getRandomIntAround(7),
  gridSize: getRandomIntAround(2),
  totalWidth: getRandomIntAround(240),
  position: [Math.max(window.innerWidth/2) - getRandomIntAround(550), Math.max(window.innerHeight/2) + getRandomIntAround(450)]
}

let elementProps6 = {
  rotation: getRandomIntAround(-130),
  width: getRandomIntAround(2),
  dasharray: getRandomIntAround(10),
  frequency: getRandomIntAround(20),
  amplitude: getRandomIntAround(10),
  gridDistance: getRandomIntAround(0),
  offset: getRandomIntAround(7),
  gridSize: getRandomIntAround(10),
  totalWidth: getRandomIntAround(180),
  position: [Math.max(window.innerWidth/2) + getRandomIntAround(550), Math.max(window.innerHeight/2) - getRandomIntAround(250)]
}

let elementProps7 = {
  rotation: getRandomIntAround(-45),
  width: getRandomIntAround(1),
  dasharray: getRandomIntAround(10),
  frequency: getRandomIntAround(10),
  amplitude: getRandomIntAround(20),
  gridDistance: getRandomIntAround(10),
  offset: getRandomIntAround(1),
  gridSize: getRandomIntAround(6),
  totalWidth: getRandomIntAround(200),
  position: [Math.max(window.innerWidth/2), Math.max(window.innerHeight)/2]
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
