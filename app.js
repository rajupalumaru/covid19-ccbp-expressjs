const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const districtSnakeToCamel = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

const reportSnakeToCamelCase = dbObject => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  }
}
//Returns a list of all states in the state table
app.get('/states/', async (request, response) => {
  const getstatesQuery = `
  select * from state;`
  const statesArray = await db.all(getstatesQuery)
  response.send(
    statesArray.map(eachState => convertDbObjectToResponseObject(eachState)),
  )
})

//Returns a state based on the state ID
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getstateQuery = `
  select * from state where state_id = ${stateId};`
  const state = await db.get(getstateQuery)
  response.send(convertDbObjectToResponseObject(state))
})

//Create a district in the district table, district_id is auto-incremented
app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const addDistrictQuery = `
    Insert into district (district_name,state_id,cases,cured,active,deaths)
    values (
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    )`
  const dbResponse = await db.run(addDistrictQuery)
  //const districtId1 = dbResponse.lastID
  response.send('District Successfully Added')
})

//Returns a district based on the district ID
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
  select * from district where district_id = ${districtId};`
  const district = await db.get(getDistrictQuery)
  response.send(districtSnakeToCamel(district))
})

//Deletes a district from the district table based on the district ID
app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
    Delete from district Where district_id = ${districtId}`
  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

//Updates the details of a specific district based on the district ID
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails

  const updateDistrictQuery = `
  Update 
  district 
  Set 
      district_name = '${districtName}',
      state_id = '${stateId}',
      cases = '${cases}',
      cured = '${cured}',
      active = '${active}',
      deaths = '${deaths}'
    Where district_id = ${districtId}`
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

//Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStateReport = `
  SELECT SUM(cases) AS cases,
  SUM(cured) AS cured,
  SUM(active) AS active,
  SUM(deaths) AS deaths
  FROM district where state_id = ${stateId};
  `
  const stateReport = await db.get(getStateReport)
  response.send(reportSnakeToCamelCase(stateReport))
})

//Returns an object containing the state name of a district based on the district ID
// app.get('/districts/:districtId/details/', async (request, response) => {
//   const {districtId} = request.params
//   const stateDetails = `
//   SELECT state_name from state JOIN district ON state.state_id = district.state_id
//   Where district.distrcit_id = ${districtId}`
//   const stateName = await db.get(stateDetails)
//   response.send({stateName: stateName.state_name})
// })

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `select state_id from district where district_id = ${districtId};`

  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery)
  const getStateNameQuery = `
    select state_name as stateName from state 
    where state_id = ${getDistrictIdQueryResponse.state_id};  `
  const getStateNameQueryResponse = await db.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
})
module.exports = app
