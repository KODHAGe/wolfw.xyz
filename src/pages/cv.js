import React from "react"

import Layout from "../components/layout"
import SEO from "../components/seo"

import CvList from "../components/cvList"

const CvPage = ({data}) => (
  <Layout whitebox="true">
    <a className="backlink" href="/" onClick={(e) => {
      e.preventDefault()
      window.history.back()
    }}>
      ← BACK
    </a>
    <SEO title="curriculum vitae" />
    <h1>CV</h1>
    <strong>Wolf Wikgren</strong>
    <p>designer, developer, analyst</p><p>interface, experience, data and visualization</p>
    <p>helsinki, finland, 1989</p>
    <a href="mailto:wolf@grh.fi">wolf@grh.fi</a>
    <CvList></CvList>
    <button className="printButton" onClick={() => {window.print()}}><span role="img" aria-label="print icon">🖨</span> Print</button>
  </Layout>
)

export default CvPage
