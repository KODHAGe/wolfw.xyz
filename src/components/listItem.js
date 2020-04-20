import { Link } from "gatsby"
//import PropTypes from "prop-types"
import Img from "gatsby-image"
import React from "react"

import style from "./listItem.module.css"

const ListItem = ({ node }) => (
  <Link className={style.listlink} to={'/' + node.slug.current}>
    <p>{node.title}</p>
    <Img fluid={node.mainImage.asset.fluid}></Img>
  </Link>
)

ListItem.propTypes = {
  
}

ListItem.defaultProps = {
  
}

export default ListItem
