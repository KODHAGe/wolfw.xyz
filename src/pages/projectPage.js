//import { Link } from "gatsby"
//import PropTypes from "prop-types"
import React from "react"
import BlockContent from "@sanity/block-content-to-react"

const ProjectPage = ({ pageContext }) => (
  <div>
    {console.log(pageContext)}
    <h2>{pageContext.title}</h2>
    <BlockContent 
      blocks={pageContext.body}
      imageOptions={{w: 320, h: 240, fit: 'max'}}
      projectId="5re0s6iv"
      dataset="prod"
    ></BlockContent>
  </div>
)

export default ProjectPage
