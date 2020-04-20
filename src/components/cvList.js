//import { Link } from "gatsby"
//import PropTypes from "prop-types"
import React from "react"
import CvListItem from "./cvListItem"
import CvListTitle from "./cvListTitle"

import style from "./cvList.module.css"

const CvList = ({ items }) => (
  <div className={style.cvlist}>
    <CvListTitle>Education</CvListTitle>
    <CvListItem dates="2015 - 2019" position="MA in New Media Design and Production" company="Aalto University School of Arts, Design and Architecture" clients="" keywords="design research, interaction design, interface design, data visualization, creative coding">
      Graduated as Master of Arts from the Aalto Media Lab. Studies in a wide range of creative topics, with a focus on user interfaces, data visualization and design research. Some of these projects are viewable in the projects-section.
    </CvListItem>
    <CvListItem dates="2013 – 2013" position="Erasmus exchange" company="Glasgow Caledonian University" clients="" keywords="user-centered design methods, experience design, ui-design">
      Exchange studies at the Graphic Design for Digital Media program on courses focusing on user-centered design tools and methods, user interface and user experience design.
    </CvListItem>
    <CvListItem dates="2011 - 2015" position="BEng. in Media Technology" company="Metropolia University of Applied Sciences" clients="" keywords="web development, digital design, graphic production, 3d-graphics">
      Graduated with a Bachelor of Engineering degree in Media Technology, with a specialisation in digital media and content production. Heavy on practical web development, with a side of design methods, 3d-graphics and printing production.
    </CvListItem>
    <CvListItem dates="2008 - 2011" position="(uncompleted) B.Sci. in Computer Science" company="University of Helsinki" clients="" keywords="computer science 101, miscellaneous academia">
      Studies in computer science, mathematics and (most importantly) cognitive science and philosophy, that set me off a different path leading to the abandonment of the pursuit of this degree.
    </CvListItem>
    <CvListTitle>Recent positions</CvListTitle>
    <CvListItem dates="2017 – present" position="Designer ∨ Developer" company="Frantic" clients="Clients: SOK, Kemira, Pihlajalinna, Posti, VTV" keywords="ux-design, ui-design, user research, prototyping, front-end development">
      A hybrid role between development and design, consulting clients in topics ranging from design research, ui- and ux-design to front-end development with modern js-technologies.
    </CvListItem>
    <CvListItem dates="2015 – 2017" position="Development specialist (part-time)" company="STT" clients="" keywords="ux-design, ui-design, front-end development, data analysis, data visualization">
      Part-time developer role along studies, with shift toward design and development of internal analytics and simple AI tools.
    </CvListItem>
    <CvListItem dates="2014 – 2015" position="Digital service developer" company="STT" clients="Clients: Iltalehti, KSML, Apu, Veikkaus" keywords="ux-design, ui-design, front-end development, data visualization">
      Responsible for web development and digital design at the development unit Digihub at STT. Focus on research and development of new digital tools for external clients.
    </CvListItem>
    <CvListItem dates="2013 – 2014" position="Data journalist, interactive graphic designer" company="STT" clients="" keywords="data journalism, information design, data visualization, web development">
      From internship to thesis project to full-time position. Pioneering projects of digital journalism and online data visualization as the first employee of the STT data newsdesk.
    </CvListItem>
    <CvListItem dates="2012 – 2012" position="Intern of everything" company="TWO" clients="Projects for: Nokia, Eevil Stöö, Disco Dislocated" keywords="concept design, photography, event production">
    Internship at the good people of creative agency TWO (RIP). Photography, concept development, event organizing, graphic & web design, coffee brewing, general entrepreneurship.
    </CvListItem>
    <CvListItem dates="2012 – present" position="Digital designer" company="GRH" clients="" keywords="web design, creative coding, digital art">
    The digital part of a two person freelance design team, currently under the moniker of GRH – the latest in a line of freelance web design work & more experimental output since my late teens.
    </CvListItem>
    <CvListTitle>Other more/less relevant skills</CvListTitle>
    <CvListItem>
      I am adept at several digital design tools, like Sketch & Adobe Suite and always trying to add more of these into my skillset. 
      I am familiar with many design methods and methodologies – like different forms of design sprints and applied variations of design thinking – and very interested in the theory behind them. I particularly enjoy building prototypes, conducting user interviews, surveys, fieldwork and teaching others the use of tools familiar to me. 
      I am a proficient front-end web developer, experienced in building software with javascript based tools such as React, Vue and Angular. When needed, diving into the back-end is not unfamiliar with applied experience in node.js and PHP.
      I am fluent in Finnish, Swedish and English at a native level (both written and oral, with a CPE-certificate for the English part).
    </CvListItem>
  </div>
)

export default CvList
