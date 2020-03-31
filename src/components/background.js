import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"
import BackgroundElement from "./backgroundElement"

import style from "./background.module.css"

const Background = ({ items }) => (
  <svg id="background" className={style.background}>
    <BackgroundElement id="default"></BackgroundElement>
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
  gridSize: 1
}

let elementProps2 = {
  rotation: 0,
  width: 1,
  dasharray: 1,
  frequency: 10,
  amplitude: 15,
  gridDistance: 10,
  offset: 12,
  gridSize: 100
}

Background.propTypes = {
  
}

Background.defaultProps = {

}

export default Background
