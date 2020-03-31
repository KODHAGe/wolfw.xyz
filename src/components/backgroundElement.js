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
    let path = createPath(props.frequency, props.amplitude, props.gridDistance * i, props.offset * i)
    path.style.stroke = color
    path.style.fill = 'none'

    // Group features
    g.appendChild(path)
    g.setAttribute("stroke-dasharray", props.dasharray)
    g.setAttribute("stroke-width", props.width)
    g.setAttribute("stroke-linecap", "round")
    g.setAttribute("transform", "translate(0, 200) rotate("+props.rotation+")")
  }
}

function createPath(frequency, amplitude, top = 0, offset = 0) {
  var path = []
  for (var x = 0; x <= 2000; x++) {
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
    rotation: 10,
    width: 1,
    dasharray: 10,
    frequency: 10,
    amplitude: 20,
    gridDistance: 10,
    offset: 1,
    gridSize: 3
  },
  color: 'black'
}
export default BackgroundElement
