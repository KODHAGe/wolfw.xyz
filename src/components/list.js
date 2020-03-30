import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"
import ListItem from "./listItem.js"

import "./list.css"

const List = ({ items }) => (
  <div className="list">
    {
      items.map(({ node }) => (
        <ListItem node={node} key={node.id}></ListItem>
      ))
    }
  </div>
)

List.propTypes = {
  
}

List.defaultProps = {
  
}

export default List
