# cloudflare-platform

## API Routes
All API routes contained in AgroGo's backend platform are defined below.

For API routes, AgroGo uses Cloudflare workers which are exposed to traditional HTTP-style routes via the use of Hono Router.

Use this for the base url if using productionized workers
- https://backend.agrogodev.workers.dev/

### `/raspi/:mac/pairingStatus`
Returns the pairing status of a raspberry pi device

```
GET <base url>/raspi/11:22:33:44:55:66/pairingStatus
```

### `/raspi/:mac/sensorReadings`
Sends sensor readings from thje Pi to the 

#### POST Request
- Sends sensor readings to D1
```
POST <base url>/raspi/11:22:33:44:55:66/sensorReadings
{ "reading": "{ 'temperature': 21.4, 'humidity': 50 }" }
```

### `/raspi/:mac/pinActionTable`
This api route returns the "Pin Action Table (PAT)" for a Raspberry Pi. The PAT returns the schedule for a Raspberry Pi. The PAT is set on the frontend and transferred to D1. That is where this route comes in. It checks for the most recent PAT and sets its local sensors accordingly.

#### GET Request
- Retrieves the most recent PAT associated with a Raspberry Pi's MAC address

**Example Request:**
```
Content-Type: application/json
GET <base url>/raspi/1a:2b:3c:4d:5e:6f/pinActionTable
```

### Firebase Header
All API routes under the `/api` route (all routes under this header) require the use of a Firebase-provided JWT. This ensures that the data is only coming from officially authenticated sources. All API calls _must_ have the following header:
- `Authorization: Bearer <firebase JWT>`

### `/api/auth/login`
This route allows us to enhance Firebase Auth's database. It should be called after a user signs in. It will take the following data from Firebase Auth:
- uid
- email
- first name
- last name

And will write that data to our D1 database. In our D1 database, there is a field for a Raspberry Pi's MAC address. This will remain blank on initial login, but can be filled in by the route `/api/auth/pairDevice`

#### POST Request
- Retrieves the currently authenticated user's Firebase information by use of the Bearer token (passed in the `Authorization` header).
- Sends the user's Firebase information to our D1 database.
- Leaves the `raspi_mac` field empty to be filled in later.

**Example Request:** (adds a new user from a firebase account)
```
POST <base url>/api/auth/login
Authoriation: Bearer <firebase JWT>
Content-Type: application/json
{
  "firstName": "Drew",
  "lastName": "Adomaitis"
}
```

### `/api/userDeviceHealth`
Checks if a device had pings within the last 20 minutes. Checks the following tables for pings
- tempAndHumidity
- waterLog
- fanLog

**Example Request:** (determines if a user has a device attached, and if it has been seen in the last 20 minutes)
```
<base url>/api/userDeviceHealth
Authorization: Bearer <firebase JWT>
Content-Type: application.json
```

### `/api/auth/pairDevice`
This route handles pairing a Raspberry Pi device (by MAC address) to a user's account.
It should be called after a user logs in and when the Raspberry Pi device is ready to be linked to that user.
Once paired, the Pi will be associated with the user in the D1 database, allowing the system to fetch/store sensor readings related to that device.

#### POST Request
- Accepts a JSON body containing the following fields:
  - `raspiMac`: The MAC address of the Raspberry Pi (string)
  - (optional) `firstName`: The user's first name (string)
  - (optional) `lastName`: The user's last name (string)
- Writes the device's MAC address to the user's record in the D1 database
- Uses the Firebase Bearer token to decode the user's Firebase Uid and retrieve their information in D1.
- Returns confirmation of the pairing, along with relevant user and device data.

**Example Request:**

```
POST <base url>/api/auth/pairDevice
Authorization: Bearer <firebase JWT>
Content-Type: application/json
{
  "raspiMac": "B8:27:EB:45:12:9F"
}
```

### `/api/data/<table name>`
This route handles all database insertion queries. The route will take incoming HTTP information and translate it into SQL queries (via the use of Drizzle ORM) that can be used to manipulate the database. This route is important because it ensures that the data is entering the database in the correct format, and from the correct actors.

AgroGo has the following tables in the D1 database. All of which can be accessed using this route
<img width="1222" height="670" alt="image" src="https://github.com/user-attachments/assets/b1b393ba-7287-46c3-a4ec-18a1490092e3" />

#### POST Request
- Inserts a new entry into a specified table.
- Uses the `json` section to specify data on each field.
- Performs a validation to ensure that an entry isn't created without needed data.

**Example Request:** (adds a new line in the User table with the following values: location = Detroit, email = adomaitisandrew@gmail.com, firstName = Drew, lastName = Adomaitis
```
POST <base url>/api/data/user
Authorization: Bearer <firebase JWT>
Content-Type: application/json
{
  "location": "Detroit",
  "email": "adomaitisandrew@gmail.com",
  "firstName": "Drew",
  "lastName": "Adomaitis"
}
```

### `/api/sendEmail`
Communicates with the Resend API to distribute an email.

Emails must originate from an email from the domain agrogo.org.

#### POST Request
- Pushes an incoming email request to Resend for distribution.
- Uses the `json` section to specify email contents, recipient, and sender.

**Example Request:** (distributes an email to the email address sent in recipient)
```
POST <base url>/api/sendEmail
Authorization: Bearer <firebase JWT>
Content-Type: application/json
{
  "recipient": "adomaitisandrew@gmail.com",
  "subject": "Hello from AgroGo!",
  "message": "Sending this message to welcome you to AgroGo.",
  "sender": "no-reply@agrogo.org"
}
```
