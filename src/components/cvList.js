import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"
import CvListItem from "./CvListItem.js"

import style from "./cvList.module.css"

const CvList = ({ items }) => (
  <div className={style.cvlist}>
    <CvListItem>foo</CvListItem>
    <CvListItem>foo</CvListItem>
  </div>
)

export default CvList
