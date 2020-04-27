
import React, {useState} from "react"

import style from "./facts.module.css"

const List = ({ facts }) => {

  const [progress, setProgress] = useState([0])
  const [progressBar, setProgressBar] = useState("[——————————]")
  const [show, setShow] = useState(facts[0])
  const update = (max) => {
    if(progress != "done" && progress.length < facts.length) {
      let numba = randomIntBetween(0, facts.length - 1)
      while (progress.includes(numba)) {
        numba = randomIntBetween(0, facts.length - 1)
      }
      progress.push(numba)
      setShow(facts[numba])
      let block = "="
      let blockNumber = Math.floor(((progress.length - 1) / (facts.length - 1))*10)
      let blocks = block.repeat(blockNumber)
      let line = "—"
      let lines = line.repeat(10 - blockNumber)
      setProgressBar("["+blocks+""+lines+"]")
    } else {
      setProgress("done") // okay man this is ugly 
      setShow("You've attained all facts available. Now let me know something about you.")
    }
  }

  return (
    <div>
      <p>Some facts about me, true at the time of writing:</p>
      <p className={style.fact}>
        {show}
      </p>
      {
        (progress != 'done') ?
        <div className={style.button} onClick={update} href="#">get to know better</div>
        : <a className={style.button} href="mailto:wolf@grh.fi">send me some some facts</a>
      }
      <p>{progressBar} {
        (progress != 'done') ?
        Math.floor(((progress.length - 1) / (facts.length - 1))*100)
        : "100"
        }%</p>
    </div>
  )
}

List.propTypes = {
  
}

List.defaultProps = {
  facts: [
    "I enjoy writing but not about myself.",
    "I can say \"thank you\" in 18 different languages last time I tried.",
    "I have spent more than 36 hours on a single train ride.",
    "I enjoy questioning conventions.",
    "I spend my free time in art museums, playing video games, walking around with a camera and riding a bicycle.",
    "I am often comfortable with being out of my comfort zone.",
    "I take pride in being a fast learner.",
    "I love programming, but I do not always enjoy software development.",
    "I believe things should not always be made as easy as possible.",
    "I've been told \"Oh that explains a lot\" when I've told someone where I grew up.",
    "I've been asked \"So your parents were hippies?\" when I've told an employer my name.",
    "I am at my happiest when I get to experiment with something new.",
    "I like simplifying complex things, but also deconstructing simple things.",
    "I think slow often beats fast.",
    "I believe competition often stifles innovation.",
    "I think being friendly is one of the most important things.",
    "I try to read as many books as I can.",
    "I've supported Manchester United since I was ten.",
    "I own an NES, SNES, N64 and GameCube.",
    "Ocarina of Time is probably my favourite game. But I play Football Manager more.",
    "My first computer was an Olivetti 486.",
    "I often prefer atmosphere over narrative.",
    "I believe the ludology vs narratology -dilemma is false.",
    "I find inspiration in sci-fi, but often find genre fiction awkward.",
    "I enjoy making data visible.",
    "I enjoy developing and formalizing processes.",
    "I think it is important to be both critical and unjudgemental.",
    "I try to be as open as I can.",
    "I believe true innovation often comes out of working with something completely beside the perceived point.",
    "I believe learning is connecting the dots between what you know and what you didn't think you needed to know.",
    "I try to count for unknown unknowns.",
    "I believe narrative mainly happens in the gap between reader and text.",
    "I believe in data-driven decisionmaking, but also believe apophenia is a bigger risk than most think.",
    "I believe in a balance between the qualitative and quantitative.",
    "I am comfortable with complexity",
    "I feel following intuition is important",
    "I think interfaces should sometimes be more delightful than useful"
  ]
}

export default List

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}