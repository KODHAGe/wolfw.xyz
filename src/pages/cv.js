import React from "react"
//import { Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

import CvList from "../components/cvList"

const CvPage = ({data}) => (
  <Layout whitebox="true">
    <SEO title="curriculum vitae" />
    <strong>Wolf Wikgren</strong>
    <p>designer, developer</p><p>ux, ui, data art and visualization</p>
    <p>helsinki, finland</p>
    <p>1989</p>
    <CvList></CvList>
  </Layout>
)

export default CvPage
