import React from "react"
import PropTypes from "prop-types"
import Background from "./background"

import "./layout.css"
import "../fonts/fonts.css"

const Layout = ({ children, whitebox }) => {

  return (
    <>
      <div>
        <main className={`${whitebox ? "whitebox" : ""}`}>{children}</main>
        <Background></Background>
      </div>
    </>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Layout
