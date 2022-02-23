import { Link } from "gatsby"
//import PropTypes from "prop-types"
import Img from "gatsby-image"
import React from "react"

import style from "./listItem.module.css"

const ListItem = ({ node }) => (
  <Link className={style.listlink} to={'/' + node.slug.current}>
    <Img fluid={node.mainImage.asset.fluid}></Img>
    <div className={style.listtitle}><span>{isAgency(node.title)} </span>{node.categories[0].title}: {node.title} → </div>
  </Link>
)

ListItem.propTypes = {
  
}

ListItem.defaultProps = {
  
}

let isAgency = (test) => {
  if(test.toLowerCase().includes('agency')) {
    return '🔒'
  } else {
    return ''
  }
}

export default ListItem
