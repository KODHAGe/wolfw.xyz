import PropTypes, { object, string } from "prop-types"
import React, { useEffect } from "react"

import style from "./backgroundElement.module.css"
console.log(style)

const BackgroundElement = ({ id, element, color }) => {

  useEffect(() => {
    draw(id, element, color)
  })

  return (
    <g id={id}>
    </g>
  )
}

function draw(id, props, color) {
  let svg = document.getElementById('background')
  let g = document.getElementById(id)
  svg.removeChild(g)
  g = document.createElementNS("http://www.w3.org/2000/svg", 'g')
  g.setAttribute('id', id)
  g.setAttribute('class', style.element)
  svg.appendChild(g)

  for (var i = 0; i < props.gridSize; i++) {
    // Path features

    let path = createPath(props.frequency, props.amplitude, props.gridDistance * i, props.offset * i, props.totalWidth)
    path.style.stroke = color
    path.style.fill = 'none'

    // Group features
    g.appendChild(path)
    g.style.transformOrigin = "center"
    g.style.transformBox = "fill-box"
    g.style.strokeDasharray = props.dasharray
    g.style.strokeWidth = props.width
    g.style.strokeLinecap = "round"
    let width = props.position[0] - g.getBBox().width / 2
    let height = props.position[1] - g.getBBox().height / 2
    //console.log(width)
    g.style.transform = "translate("+ width +"px, "+ height +"px) rotate("+props.rotation+"deg)"
  }
}

function createPath(frequency, amplitude, top = 0, offset = 0, totalWidth = 2000) {
  var path = []
  for (var x = 0; x <= totalWidth; x++) {
    var angle = (x / frequency) * Math.PI * 2
    var y = top + Math.sin(angle) * (amplitude / 2)
    // M = move to, L = line to
    path.push((x === 0 ? 'M' : 'L') + (x + offset) + ',' + y)
  }

  var pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path")
  pathEl.setAttribute('d', path.join(' ') )
  return pathEl
}


BackgroundElement.propTypes = {
  id: string,
  element: object,
  color: string
}

BackgroundElement.defaultProps = {
  id: 'g',
  element: {
    rotation: -45,
    width: 1,
    dasharray: 10,
    frequency: 10,
    amplitude: 20,
    gridDistance: 10,
    offset: 1,
    gridSize: 6,
    totalWidth: 200,
    position: [Math.max(window.innerWidth/2), Math.max(window.innerHeight)/2]
  },
  color: 'black'
}
export default BackgroundElement
