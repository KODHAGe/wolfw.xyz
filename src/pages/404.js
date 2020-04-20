import React from "react"

import Layout from "../components/layout"
import SEO from "../components/seo"
import { Link } from "gatsby"

const NotFoundPage = () => (
  <Layout>
    <SEO title="404: Not found" />
    <h1>404 no good</h1>
    <p>Sorry, this doesn't exist. Please go <Link to="/">to the front page</Link></p>
  </Layout>
)

export default NotFoundPage
