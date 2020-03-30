import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"

import style from "./cvListItem.module.css"

const CvListItem = ({ node }) => (
  <div className={style.cvlistitem}>
    <div className={style.timetag}>2017 – now</div>
    <div className={style.position}>Dev & design @ Frantic</div>
    <div className={style.description}>I've been making web happen at Frantic since 2017 in varying roles depending on the project, ranging from full-stack development to design research.</div>
    <div className={style.clients}>Kemira, Pihlajalinna, Posti, SOK, Syöpäsäätiö, VTV</div>
    <div className={style.keywords}>ux, ui, web, app, full-stack, front-end</div>
  </div>
)

export default CvListItem
