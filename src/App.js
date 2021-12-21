import React, { useState } from "react"
import "./App.css"
import background from "./images/background2.jpg"

function App() {
  const [start, setStart] = useState() //user-input start date
  const [end, setEnd] = useState() //user-input end date

  const [longestBear, setLongestBear] = useState() // the longest down-trend
  const [topVolumeDate, setTopVolumeDate] = useState() // date of the top volume
  const [topVolume, setTopVolume] = useState() // top volume in euros
  const [buyDate, setBuyDate] = useState() // suggested date to buy in the range
  const [sellDate, setSellDate] = useState() // suggested date to sell in the range
  const [dataInconsistencies, setDataInconsistencies] = useState(false) // if the API doesn't provide a datapoint for each date in the range, the user is notified

  // when form is submitted, this function makes a query to the API based on selected dates
  // & calls functions to process the data
  const makeCoinGeckoQuery = e => {
    e.preventDefault()
    const sdate = date2unixDate(start)
    const edate = date2unixDate(end) + 3600
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from=${sdate}&to=${edate}`
    fetch(url)
      .then(res => {
        if (res.status >= 200 && res.status <= 299) {
          return res.json()
        } else {
          throw Error(res.statusText)
        }
      })
      .then(json => {
        let cryptoData = processAPIdata(json)
        calcLongestBearTrend(cryptoData.prices)
        highestVolume(cryptoData.volumes)
        maxProfit(cryptoData.prices)
      })
      .catch(error => {
        alert(error.message)
      })
  }

  //processes the data to a more usable form: changes UNIX-times to Date objects &
  //transforms the data granularity to the desired level (closest datapoint after 00:00 UTC for each day)
  const processAPIdata = json => {
    let prices = []
    let volumes = []
    let dates = getDatesInRange()

    //finds the closest datapoint to 00:00 UTC for each date in the range
    for (let date of dates) {
      let pricepoint = json.prices.find(p => {
        return matchingDate(date, unix2date(p[0]))
      })
      prices.push([unix2date(pricepoint[0]), pricepoint[1]])

      let volumepoint = json.total_volumes.find(v => {
        return matchingDate(date, unix2date(v[0]))
      })
      volumes.push([unix2date(volumepoint[0]), volumepoint[1]])
    }

    if (prices.length !== dates.length) {
      setDataInconsistencies(true)
    }

    return { prices: prices, volumes: volumes }
  }

  /**
   * returns an array of all dates in the set date-range
   */
  const getDatesInRange = () => {
    let nOfDays =
      (new Date(end).getTime() - new Date(start).getTime()) /
      (1000 * 3600 * 24)
    let prevDate = new Date(start)
    let dates = [new Date(start)]
    for (let i = 0; i < nOfDays; i++) {
      let newDate = new Date(prevDate)
      newDate.setDate(newDate.getDate() + 1)
      dates.push(newDate)
      prevDate = newDate
    }
    return dates
  }

  /**
   * the compare-function checks if two date-objects have the same year, month, and day in UTC time
   */
  const matchingDate = (first, last) => {
    return (
      first.getUTCFullYear() === last.getUTCFullYear() &&
      first.getUTCMonth() === last.getUTCMonth() &&
      first.getUTCDate() === last.getUTCDate()
    )
  }

  /**
   * determines the best days to buy & sell in the date-range
   */
  const maxProfit = (prices) => {
    let profit = 0
    let bestBuy
    let bestSell

    for (let i = 0; i < prices.length; i++) {
      let currentBuy = prices[i][1]
      for (let j = i + 1; j < prices.length; j++) {
        let currentSell = prices[j][1]
        if (currentSell - currentBuy > profit) {
          profit = currentSell - currentBuy
          bestBuy = prices[i][0]
          bestSell = prices[j][0]
        }
      }
    }

    if (bestBuy === undefined || bestSell === undefined || profit === 0) {
      setBuyDate("DON'T BUY!")
      setSellDate("DON'T SELL!")
      return
    }

    setBuyDate(bestBuy.toDateString())
    setSellDate(bestSell.toDateString())
  }

  /**
   * calculates the length of the longest consecutive downward price trend in the range
   */
  const calcLongestBearTrend = (prices) => {
    let currentTrend = [] //keeps track of the trend being calculated
    let longestTrend = [] //the longest found trend

    for (let i = 1; i < prices.length; i++) {
      if (prices[i][1] < prices[i - 1][1]) {
        currentTrend.push(prices[i])

        if (currentTrend.length > longestTrend.length) {
          longestTrend = currentTrend
        }
      } else {
        currentTrend = []
      }
    }
    setLongestBear(longestTrend.length)
  }

  /**
   * Finds the date with highest volume in the given range
   */
  const highestVolume = (volumes) => {
    let highest = volumes[0]
    for (let i = 1; i < volumes.length; i++) {
      if (volumes[i][1] > highest[1]) highest = volumes[i]
    }
    setTopVolume(highest[1])
    setTopVolumeDate(unix2date(highest[0]).toDateString())
  }

  //transforms a Date object to an UNIX timestamp
  const date2unixDate = (date) => {
    const asDate = new Date("" + date)
    return asDate.getTime() / 1000
  }

  //transforms an UNIX timestamp to a Date object
  const unix2date = (unix) => {
    return new Date(unix)
  }

  // converts an amount in euros to a grammatically correct string 
  const euroString = (amount) => {
    let formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    })

    return formatter.format(amount)
  }

  return (
    <div
      className="App"
      id="app"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: "70% 100%",
        margin: "0",
      }}
    >
      <form onSubmit={makeCoinGeckoQuery}>
        <h2>Pick a start and an end date</h2>
        <div id="dateform">
          <div>
            <label>
              Start
              <input
                type="date"
                id="start"
                onChange={(e) => setStart(e.target.value)}
                required="required"
                max={
                  new Date(Date.now() - 86400000).toISOString().split("T")[0]
                }
              ></input>
            </label>
            <label>
              End
              <input
                type="date"
                id="start"
                onChange={(e) => setEnd(e.target.value)}
                required="required"
                max={new Date().toISOString().split("T")[0]}
              ></input>
            </label>
            <button type="submit">Make query</button>
          </div>
        </div>
      </form>
      {dataInconsistencies && <p>The price data is missing some datapoints</p>}
      <BearTrend longestBear={longestBear} />
      <Volume topVolume={euroString(topVolume)} topVolumeDate={topVolumeDate} />
      <BuyAndSell buyDate={buyDate} sellDate={sellDate} />
    </div>
  )
}

function BearTrend({ longestBear }) {
  return (
    <div id="bear">
      {longestBear !== undefined && (
        <div>
          <h2>Bear data</h2>
          <p>Longest bearish trend in the date range was {longestBear} days</p>
        </div>
      )}
    </div>
  )
}

function Volume({ topVolumeDate, topVolume }) {
  return (
    <div id="volume">
      {topVolumeDate !== undefined && topVolume !== undefined && (
        <div>
          <h2>Highest trading volume</h2>
          <p>
            The highest trading volume in the date range was on {topVolumeDate}{" "}
            with a total trading volume of {topVolume}
          </p>
        </div>
      )}
    </div>
  )
}

function BuyAndSell({ buyDate, sellDate }) {
  return (
    <div id="timetravel">
      {buyDate !== undefined && sellDate !== undefined && (
        <div>
          <h2>Instructions for Scrooge's time travel adventure</h2>
          <p>
            <b>Buy:</b> {buyDate} <b>Sell:</b> {sellDate}
          </p>
        </div>
      )}
    </div>
  )
}

export default App
