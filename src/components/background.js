import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"
import BackgroundElement from "./backgroundElement"

import style from "./background.module.css"

const Background = ({ items }) => (
  <svg id="background" className={style.background}>
    <BackgroundElement id="default"></BackgroundElement>
    <BackgroundElement id="extra" element={elementProps}></BackgroundElement>
    <BackgroundElement id="exthree" element={elementProps2}></BackgroundElement>
    <BackgroundElement id="exfour" element={elementProps3}></BackgroundElement>
    <BackgroundElement id="exfive" element={elementProps4}></BackgroundElement>
    <BackgroundElement id="exsix" element={elementProps5}></BackgroundElement>
    <BackgroundElement id="exseven" element={elementProps6}></BackgroundElement>
  </svg>
)

let elementProps = {
  rotation: 80,
  width: 10,
  dasharray: 100,
  frequency: 100,
  amplitude: 60,
  gridDistance: 0,
  offset: 7,
  gridSize: 1,
  totalWidth: 200,
  position: [Math.max(window.innerWidth/2) + 110, Math.max(window.innerHeight/2) - 50]
}

let elementProps2 = {
  rotation: -10,
  width: 1,
  dasharray: 100,
  frequency: 10,
  amplitude: 15,
  gridDistance: 10,
  offset: 12,
  gridSize: 10,
  totalWidth: 200,
  position: [Math.max(window.innerWidth/2) - 200, Math.max(window.innerHeight/2) + 100]
}

let elementProps3 = {
  rotation: 20,
  width: 1,
  dasharray: 100,
  frequency: 2,
  amplitude: 15,
  gridDistance: 10,
  offset: 200,
  gridSize: 7,
  totalWidth: 240,
  position: [Math.max(window.innerWidth/2) - 400, Math.max(window.innerHeight/2) + 250]
}

let elementProps4 = {
  rotation: 30,
  width: 2,
  dasharray: 80,
  frequency: 20,
  amplitude: 60,
  gridDistance: 100,
  offset: 12,
  gridSize: 7,
  totalWidth: 200,
  position: [Math.max(window.innerWidth/2) + 300, Math.max(window.innerHeight/2) - 150]
}

let elementProps5 = {
  rotation: -180,
  width: 8,
  dasharray: 10,
  frequency: 120,
  amplitude: 20,
  gridDistance: 0,
  offset: 7,
  gridSize: 2,
  totalWidth: 240,
  position: [Math.max(window.innerWidth/2) - 550, Math.max(window.innerHeight/2) + 450]
}

let elementProps6 = {
  rotation: -130,
  width: 2,
  dasharray: 10,
  frequency: 20,
  amplitude: 10,
  gridDistance: 0,
  offset: 7,
  gridSize: 10,
  totalWidth: 180,
  position: [Math.max(window.innerWidth/2) + 550, Math.max(window.innerHeight/2) - 250]
}

Background.propTypes = {
  
}

Background.defaultProps = {

}

export default Background
