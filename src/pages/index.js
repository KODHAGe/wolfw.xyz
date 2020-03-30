import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import Image from "../components/image"
import SEO from "../components/seo"
import List from "../components/list"

const IndexPage = ({data}) => (
  <Layout>
    <SEO title="wolfw.xyz" />
    <h1 className="siteTitle">wolfw.xyz</h1>
    <div className="description">I am a painter of the digital world, the web is my canvas.</div>
    <div className="contact">
    </div>
    <div className="main">
      <p><Link to="/projects">projects</Link></p>
      <p><Link to="/about">about</Link></p>
      <p><Link to="/cv">cv</Link></p>
      <p><a href="https://github.com/KODHAGe">github</a></p>
    </div>
  </Layout>
)

export default IndexPage