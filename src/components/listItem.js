import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"

import style from "./listItem.module.css"

const ListItem = ({ node }) => (
  <Link className={style.listlink} to={'/' + node.slug.current}>
    {console.log(node)}
    <p>{node.title}</p>
    <img src={node.mainImage.asset.url}></img>
  </Link>
)

ListItem.propTypes = {
  
}

ListItem.defaultProps = {
  
}

export default ListItem
