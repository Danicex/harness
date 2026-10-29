import { useCallback, useEffect, useState } from "react";
import {
  Users, Search, RefreshCw, Eye, UserRound, BriefcaseBusiness, Snowflake, Trash2, CreditCard, Loader2, MoreHorizontal, AlertCircle, KeyRound
} from "lucide-react";

import {
  get_all_users,
  get_user_sub,
  get_user_staff,
  freze_user,
  unfreeze_user,
  deactivate_user
} from "./admin_previledge"; // Update this import path

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CredentialsDialog } from "./adminCredentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const getUserId = (user) => user.id ?? user.user_id;

const getUserName = (user) =>
  user.name ||
  user.full_name ||
  user.username ||
  user.email ||
  `User ${getUserId(user)}`;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
};

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");

  const [confirmFreezeUser, setConfirmFreezeUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const [credentialsUser, setCredentialsUser] = useState(null);
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const data = await get_all_users();

      // Supports either an array or a { users: [...] } response.
      const userList = Array.isArray(data) ? data : data?.users;

      setUsers(Array.isArray(userList) ? userList : []);
    } catch (error) {
      setPageError(
        error.response?.data?.detail ||
        error.message ||
        "Failed to fetch users."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const query = search.toLowerCase();

    return [
      getUserName(user),
      user.email,
      user.username,
      String(getUserId(user) ?? ""),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const handleViewStaff = async (user) => {
    setSelectedUser(user);
    setStaff([]);
    setStaffError("");
    setStaffDialogOpen(true);
    setStaffLoading(true);

    try {
      const data = await get_user_staff(getUserId(user));

      const staffList = Array.isArray(data)
        ? data
        : data?.staff ?? data?.members ?? [];

      setStaff(Array.isArray(staffList) ? staffList : []);
    } catch (error) {
      setStaffError(
        error.response?.data?.detail ||
        error.message ||
        "Failed to load staff details."
      );
    } finally {
      setStaffLoading(false);
    }
  };

  const handleViewSubscription = async (user) => {
    setSelectedUser(user);
    setSubscription(null);
    setSubscriptionError("");
    setSubscriptionOpen(true);
    setSubscriptionLoading(true);

    try {
      const data = await get_user_sub(getUserId(user));
      setSubscription(data);
    } catch (error) {
      setSubscriptionError(
        error.response?.data?.detail ||
        error.message ||
        "Failed to load subscription."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleFreeze = async () => {
    const user = confirmFreezeUser;

    if (!user) return;

    const id = getUserId(user);
    setActionLoading(id);
    setConfirmFreezeUser(null);

    try {
      await (isFrozen(user) ? unfreeze_user(id) : freze_user(id));
      await fetchUsers();
    } catch (error) {
      setPageError(
        error.response?.data?.detail ||
        error.message ||
        "Failed to update user status."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    const user = confirmDeleteUser;

    if (!user) return;

    const id = getUserId(user);

    setConfirmDeleteUser(null);
    setActionLoading(id);
    setPageError("");

    try {
      await deactivate_user(id);

      setUsers((currentUsers) =>
        currentUsers.filter((item) => getUserId(item) !== id)
      );
    } catch (error) {
      setPageError(
        error.response?.data?.detail ||
        error.message ||
        "Failed to delete user."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const isFrozen = (user) =>
    user.account_status === "suspended" ||
    user.is_frozen === true ||
    user.is_active === false ||
    user.status === "frozen";

  return (
    <div className="min-h-screen space-y-6 p-4 md:p-8">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border p-2">
              <Users className="h-5 w-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              User Management
            </h1>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Manage platform users, subscriptions, and staff.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchUsers}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Total users
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {users.length}
              </p>
            </div>

            <Users className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Frozen users
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {users.filter(isFrozen).length}
              </p>
            </div>

            <Snowflake className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All users</CardTitle>
              <CardDescription className="mt-1">
                View and manage registered users.
              </CardDescription>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-0">
          {pageError && (
            <div className="m-4 flex items-start gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{pageError}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Loading users...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const id = getUserId(user);
                    const frozen = isFrozen(user);

                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium">
                              {getUserName(user)
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {getUserName(user)}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {user.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {id ?? "—"}
                        </TableCell>

                        <TableCell>
                          <Badge variant={frozen ? "destructive" : "secondary"}>
                            {user.account_status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {formatDate(
                            user.created_at ||
                            user.date_created ||
                            user.created_on
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Actions for ${getUserName(user)}`}
                                  disabled={actionLoading === id}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>


                              <DropdownMenuContent align="end">

                                <DropdownMenuItem onClick={() => setCredentialsUser(user)}>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Credentials
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleViewStaff(user)}
                                >
                                  <BriefcaseBusiness className="mr-2 h-4 w-4" />
                                  View staff
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleViewSubscription(user)}
                                >
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Subscription
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => setConfirmFreezeUser(user)}
                                >
                                  <Snowflake className="mr-2 h-4 w-4" />
                                  {frozen ? "Unfreeze user" : "Freeze user"}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setConfirmDeleteUser(user)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete user
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t px-6 py-4 text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>

      {/* Staff dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff details</DialogTitle>
            <DialogDescription>
              Staff associated with{" "}
              {selectedUser ? getUserName(selectedUser) : "this user"}.
            </DialogDescription>
          </DialogHeader>

          {staffLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Loading staff details...
              </p>
            </div>
          ) : staffError ? (
            <div className="rounded-md border border-destructive/30 p-4 text-sm text-destructive">
              {staffError}
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserRound className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No staff found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This user has no staff records to display.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {staff.map((member, index) => (
                    <TableRow
                      key={member.id ?? member.staff_id ?? index}
                    >
                      <TableCell className="font-medium">
                        {member.name ||
                          member.full_name ||
                          member.username ||
                          "—"}
                      </TableCell>
                      <TableCell>{member.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {member.role || member.position || "Staff"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscription dialog */}
      <Dialog
        open={subscriptionOpen}
        onOpenChange={setSubscriptionOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subscription details</DialogTitle>
            <DialogDescription>
              Subscription for{" "}
              {selectedUser ? getUserName(selectedUser) : "this user"}.
            </DialogDescription>
          </DialogHeader>

          {subscriptionLoading ? (
            <div className="flex items-center justify-center gap-2 py-10">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading subscription...
              </span>
            </div>
          ) : subscriptionError ? (
            <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
              {subscriptionError}
            </p>
          ) : subscription ? (
            <div className="space-y-4">
              {Object.entries(subscription).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <span className="capitalize text-muted-foreground">
                    {key.replaceAll("_", " ")}
                  </span>
                  <span className="max-w-[60%] break-words text-right font-medium">
                    {value == null
                      ? "—"
                      : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No subscription details available.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Freeze confirmation */}
      <AlertDialog
        open={Boolean(confirmFreezeUser)}
        onOpenChange={(open) => {
          if (!open) setConfirmFreezeUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmFreezeUser && isFrozen(confirmFreezeUser)
                ? "Unfreeze this user?"
                : "Freeze this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Continue with this action for{" "}
              {confirmFreezeUser
                ? getUserName(confirmFreezeUser)
                : "this user"}
              ? Your backend determines the actual effect of this operation.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFreeze}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(confirmDeleteUser)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete{" "}
              {confirmDeleteUser
                ? getUserName(confirmDeleteUser)
                : "this user"}
              . This action may permanently remove their data.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CredentialsDialog
  open={Boolean(credentialsUser)}
  onOpenChange={(open) => {
    if (!open) setCredentialsUser(null);
  }}
  adminId={credentialsUser ? getUserId(credentialsUser) : null}
  adminName={credentialsUser ? getUserName(credentialsUser) : undefined}
/>
    </div>
  );
}
