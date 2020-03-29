import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"

const ListItem = ({ node }) => (
  <Link to={node.slug.current}>
    <h2>{node.title}</h2>
    <img src={node.mainImage.asset.url}></img>
  </Link>
)

ListItem.propTypes = {
  
}

ListItem.defaultProps = {
  
}

export default ListItem
