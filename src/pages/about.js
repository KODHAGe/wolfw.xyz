import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
//import Image from "../components/image"
import SEO from "../components/seo"

const AboutPage = ({data}) => (
  <Layout whitebox="true">
    <SEO title="about" />
    <div>This is a story all bout how my life got</div>
  </Layout>
)

export default AboutPage
