//import { Link } from "gatsby"
import { string } from "prop-types"
import React from "react"

import style from "./cvListItem.module.css"

const CvListItem = ({ children, dates, position, company, clients, keywords }) => (
  <div className={style.cvlistitem}>
    <div className={style.timetag}>{dates}</div>
    <div className={style.company}>{company}</div>
    <div className={style.position}>{position}</div>
    <div className={style.description}>{children}</div>
    <div className={style.clients}>{clients}</div>
    <div className={style.keywords}>{keywords}</div>
  </div>
)

CvListItem.propTypes = {
  dates: string,
  company: string,
  position: string,
  clients: string,
  keywords: string
}

CvListItem.defaultProps = {
  dates: "",
  company: "",
  position: "",
  clients: "",
  keywords: ""
}

export default CvListItem
