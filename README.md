# d1-playground
Document created and managed by Drew

Any questions/comments about how Terraform is being used? Ask me! - Drew

## Intro
This branch will guide users through setting up Terraform and get them familiar with what its purpose is in our project.

This document will give instructions on the following:
- Downloading Terraform onto your computer
- Setting up Terraform in your VSCode environment
- Get our specific API keys (as well as how to make your own)
- Experiment creating/deleting a D1 database

Feel free to use this branch as a way to experiment provisioning more resources.

## Downloading Terraform onto your computer
The first step is to download Terraform onto your computer. To do this, go to Hashicorp's [official download page for Terraform](https://developer.hashicorp.com/terraform/install). There are options to use either binary downloads or package managers. Follow their instructions and then return to this document.

## Setting up Terraform in VSCode
To use Terraform best, you will need to integrate it with your IDE. VSCode has some great ways to use Terraform.

First you will want to install the "HashiCorp Terraform" VSCode extension by entering "terraform" in the extensions page in VSCode:
<img width="320" height="525" alt="image" src="https://github.com/user-attachments/assets/a98b301a-446f-43a1-a411-40a6a5c7e51e" />

---

I also suggest using the "Better Align" extension by Chouzz:

<img width="329" height="514" alt="image" src="https://github.com/user-attachments/assets/096f8059-64a4-496e-aa13-954a84d3f73e" />

---

Terraform convention is to have all your "=" signs aligned together and you will have a lot of them. This extension lets you turn this:

<img width="704" height="204" alt="image" src="https://github.com/user-attachments/assets/6a5c556e-b39b-45dc-9c45-8a8555bd7503" />

---

Into this:

<img width="702" height="213" alt="image" src="https://github.com/user-attachments/assets/badab8c9-d427-4228-a102-aadfbe7ceaad" />

---

Just select the code you are aligning and press `alt + a`:

<img width="704" height="204" alt="image" src="https://github.com/user-attachments/assets/5efea6f0-5bea-4383-9be1-9c2e42ba0d62" />

---

## Get our specific API keys
Create an `.env` file under the `infra` folder. The `.gitignore` should prevent this from being committed to the repository, but verify this by ensuring that it is greyed out (like in the screenshot below):

<img width="253" height="373" alt="image" src="https://github.com/user-attachments/assets/2dfd6579-19e2-44e8-91a3-1a7fb630d092" />

--- 

Copy/paste the `.env` file lines from the message pinned in the "credentials" file.

## Experimenting creating/deleting a D1 database
First, navigate to the `infra` folder. Then enter the command `terraform init`. This will download any dependencies or providers needed for the project.

Then enter the command `terraform apply`. This will create a D1 database with the information.

You should get output looking like this (after entering "yes" in the field)

<img width="858" height="190" alt="image" src="https://github.com/user-attachments/assets/5676730f-3f6b-464e-86a9-41b0f2184d56" />

_NOTE:_ If you get an error looking like the one below. That probably means that a D1 database with matching information is already created, and you need to enter `terraform destroy` to delete it.

<img width="752" height="118" alt="image" src="https://github.com/user-attachments/assets/6b9d7cae-cb18-48dc-9c97-ae5061640007" />

---

## Some final notes

### Database verification
You can verify that the database has been created by logging into our Cloudflare account, going to the "D1 SQL database" section:

<img width="266" height="876" alt="image" src="https://github.com/user-attachments/assets/9ef14f10-bcec-4be1-939a-1e4ea79a751d" />

and then looking for the "tf-playground-agrogo-db" database:

<img width="916" height="361" alt="image" src="https://github.com/user-attachments/assets/cf1be1aa-5e59-4fe3-bc07-9e7279a9e4c7" />

### Naming convention
Note the name "tf-playground-agrogo-db." Personally, I like to indicate somehow what resources are coming from Terraform. In AWS, this is usually by tagging, but I didn't find any easy ways to add tags to our Cloudflare resources. So, I decided to add a "tf-" to the start of all our Terraform-created resources. I did this inside the module itself. When I added the code to create resource from the "main.tf" file, I had the following code:

```
// Provide the Cloudflare plugin - Drew
terraform {
    required_providers {
        cloudflare = {
            source  = "cloudflare/cloudflare"
            version = "~> 5.0"
        }
    }
}

// Point Terraform to the Cloudflare plugin given above - Drew
provider "cloudflare" {
    api_token = var.d1_access_api_token
}

// Load the data-layer resources - Drew
module "data-layer" {
    source     = "./data-layer"
    account_id = var.account_id
    name       = "playground-agrogo-db"

    providers = {
        cloudflare = cloudflare
    }
}
```

And in the code inside the actual module itself, I added the "tf-" indicator like this:

```
// Template for provisioning a basic d1 database - Drew
resource "cloudflare_d1_database" "agrogo_db" {
    account_id = var.account_id
    name       = "tf-${var.name}"
}
```

This lets us provision multiple databases and not worry about adding the "tf-" indicator.
