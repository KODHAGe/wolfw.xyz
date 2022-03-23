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
    <div>
      <strong>Wolf Wikgren</strong>
      <p>designer, developer, data analyst</p><p>interface, experience, data and visualization</p>
      <p>helsinki, finland</p>
    </div>
    <CvList></CvList>
    <button className="printButton" onClick={() => {window.print()}}><span role="img" aria-label="print icon">🖨</span> Print</button>
  </Layout>
)

export default CvPage
