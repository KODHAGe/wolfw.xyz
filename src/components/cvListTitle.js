//import { Link } from "gatsby"
//import PropTypes from "prop-types"
import React from "react"

import style from "./cvListTitle.module.css"

const CvListTitle = ({ children }) => (
  <div className={style.cvlisttitle}>
    {children}
  </div>
)

CvListTitle.propTypes = {
  
}

CvListTitle.defaultProps = {
  
}

export default CvListTitle
