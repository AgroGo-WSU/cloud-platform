# cloudflare-platform

## API Routes
All API routes contained in AgroGo's backend platform are defined below.

For API routes, AgroGo uses Cloudflare workers which are exposed to traditional HTTP-style routes via the use of Hono Router.

### Firebase Header
All API routes require the use of a Firebase-provided JWT. This ensures that the data is only coming from officially authenticated sources. All API calls _must_ have the following header:
- `Authorization: Bearer <firebase JWT>`

### `/api/data/<table name>`
This route handles all database queries. The route will take incoming HTTP information and translate it into SQL queries (via the use of Drizzle ORM) that can be used to manipulate the database. This route is important because it ensures that the data is entering the database in the correct format, and from the correct actors.

AgroGo has the following tables in the D1 database. All of which can be accessed using this route
<img width="1222" height="670" alt="image" src="https://github.com/user-attachments/assets/b1b393ba-7287-46c3-a4ec-18a1490092e3" />

#### POST Request
- Inserts a new entry into a specified table.
- Uses the `json` section to specify data on each field.
- Performs a validation to ensure that an entry isn't created without needed data.
- Example query: (adds a new line in the User table with the following values: location = Detroit, email = adomaitisandrew@gmail.com, firstName = Drew, lastName = Adomaitis
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

#### GET Request
- Returns an amount of entries from a specified table.
- If no specified amount is given, defaults to 100 entries.
- Uses query params at the end of the url to take in filtering parameters on the table.
- Example query: (returns the last 5 users with the first name "Drew")
```
GET <base url>/api/data/user?firstName=Drew&limit=5
Authorization: Bearer <firebase JWT>
Content-Type: application/json
```

### `/api/sendEmail`
Communicates with the Resend API to distribute an email.

Emails must originate from an email from the domain agrogo.org.

#### POST Request
- Pushes an incoming email request to Resend for distribution.
- Uses the `json` section to specify email contents, recipient, and sender.
- Example query: (distributes an email to the email address 
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
