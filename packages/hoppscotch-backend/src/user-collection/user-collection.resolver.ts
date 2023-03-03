import { UseGuards } from '@nestjs/common';
import {
  Resolver,
  Mutation,
  Args,
  ID,
  Query,
  ResolveField,
  Parent,
  Subscription,
} from '@nestjs/graphql';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { AuthUser } from 'src/types/AuthUser';
import { UserCollectionService } from './user-collection.service';
import {
  UserCollection,
  UserCollectionReorderData,
} from './user-collections.model';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';
import { User } from 'src/user/user.model';
import { PaginationArgs } from 'src/types/input-types.args';
import {
  CreateChildUserCollectionArgs,
  CreateRootUserCollectionArgs,
  MoveUserCollectionArgs,
  RenameUserCollectionsArgs,
  UpdateUserCollectionArgs,
} from './input-type.args';
import { ReqType } from 'src/types/RequestTypes';

@Resolver(() => UserCollection)
export class UserCollectionResolver {
  constructor(
    private readonly userCollectionService: UserCollectionService,
    private readonly pubSub: PubSubService,
  ) {}

  // Field Resolvers
  @ResolveField(() => User, {
    description: 'User the collection belongs to',
  })
  async user(@GqlUser() user: AuthUser) {
    return user;
  }

  @ResolveField(() => UserCollection, {
    description: 'Parent user collection (null if root)',
    nullable: true,
  })
  async parent(@Parent() collection: UserCollection) {
    return this.userCollectionService.getParentOfUserCollection(collection.id);
  }

  @ResolveField(() => [UserCollection], {
    description: 'List of children REST user collection',
    complexity: 3,
  })
  childrenREST(
    @Parent() collection: UserCollection,
    @Args() args: PaginationArgs,
  ) {
    return this.userCollectionService.getChildrenOfUserCollection(
      collection.id,
      args.cursor,
      args.take,
      ReqType.REST,
    );
  }

  @ResolveField(() => [UserCollection], {
    description: 'List of children GraphQL user collection',
    complexity: 3,
  })
  childrenGQL(
    @Parent() collection: UserCollection,
    @Args() args: PaginationArgs,
  ) {
    return this.userCollectionService.getChildrenOfUserCollection(
      collection.id,
      args.cursor,
      args.take,
      ReqType.GQL,
    );
  }

  // Queries
  @Query(() => [UserCollection], {
    description: 'Get the root REST user collections for a user',
  })
  @UseGuards(GqlAuthGuard)
  rootRESTUserCollections(
    @GqlUser() user: AuthUser,
    @Args() args: PaginationArgs,
  ) {
    return this.userCollectionService.getUserRootCollections(
      user,
      args.cursor,
      args.take,
      ReqType.REST,
    );
  }

  @Query(() => [UserCollection], {
    description: 'Get the root GraphQL user collections for a user',
  })
  @UseGuards(GqlAuthGuard)
  rootGQLUserCollections(
    @GqlUser() user: AuthUser,
    @Args() args: PaginationArgs,
  ) {
    return this.userCollectionService.getUserRootCollections(
      user,
      args.cursor,
      args.take,
      ReqType.GQL,
    );
  }

  @Query(() => UserCollection, {
    description: 'Get user collection with ID',
  })
  @UseGuards(GqlAuthGuard)
  async userCollection(
    @Args({
      type: () => ID,
      name: 'userCollectionID',
      description: 'ID of the user collection',
    })
    userCollectionID: string,
  ) {
    const userCollection = await this.userCollectionService.getUserCollection(
      userCollectionID,
    );

    if (E.isLeft(userCollection)) throwErr(userCollection.left);
    return userCollection.right;
  }

  // Mutations
  @Mutation(() => UserCollection, {
    description: 'Creates root REST user collection(no parent user collection)',
  })
  @UseGuards(GqlAuthGuard)
  async createRESTRootUserCollection(
    @GqlUser() user: AuthUser,
    @Args() args: CreateRootUserCollectionArgs,
  ) {
    const userCollection =
      await this.userCollectionService.createUserCollection(
        user,
        args.title,
        null,
        ReqType.REST,
      );

    if (E.isLeft(userCollection)) throwErr(userCollection.left);
    return userCollection.right;
  }

  @Mutation(() => UserCollection, {
    description:
      'Creates root GraphQL user collection(no parent user collection)',
  })
  @UseGuards(GqlAuthGuard)
  async createGQLRootUserCollection(
    @GqlUser() user: AuthUser,
    @Args() args: CreateRootUserCollectionArgs,
  ) {
    const userCollection =
      await this.userCollectionService.createUserCollection(
        user,
        args.title,
        null,
        ReqType.GQL,
      );

    if (E.isLeft(userCollection)) throwErr(userCollection.left);
    return userCollection.right;
  }

  @Mutation(() => UserCollection, {
    description: 'Creates a new child REST user collection',
  })
  @UseGuards(GqlAuthGuard)
  async createGQLChildUserCollection(
    @GqlUser() user: AuthUser,
    @Args() args: CreateChildUserCollectionArgs,
  ) {
    const userCollection =
      await this.userCollectionService.createUserCollection(
        user,
        args.title,
        args.parentUserCollectionID,
        ReqType.GQL,
      );

    if (E.isLeft(userCollection)) throwErr(userCollection.left);
    return userCollection.right;
  }

  @Mutation(() => UserCollection, {
    description: 'Creates a new child GraphQL user collection',
  })
  @UseGuards(GqlAuthGuard)
  async createRESTChildUserCollection(
    @GqlUser() user: AuthUser,
    @Args() args: CreateChildUserCollectionArgs,
  ) {
    const userCollection =
      await this.userCollectionService.createUserCollection(
        user,
        args.title,
        args.parentUserCollectionID,
        ReqType.REST,
      );

    if (E.isLeft(userCollection)) throwErr(userCollection.left);
    return userCollection.right;
  }

  @Mutation(() => UserCollection, {
    description: 'Rename a user collection',
  })
  @UseGuards(GqlAuthGuard)
  async renameUserCollection(
    @GqlUser() user: AuthUser,
    @Args() args: RenameUserCollectionsArgs,
  ) {
    const updatedUserCollection =
      await this.userCollectionService.renameCollection(
        args.newTitle,
        args.userCollectionID,
        user.uid,
      );

    if (E.isLeft(updatedUserCollection)) throwErr(updatedUserCollection.left);
    return updatedUserCollection.right;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a user collection',
  })
  @UseGuards(GqlAuthGuard)
  async deleteUserCollection(
    @Args({
      name: 'userCollectionID',
      description: 'ID of the user collection',
      type: () => ID,
    })
    userCollectionID: string,
    @GqlUser() user: AuthUser,
  ) {
    const result = await this.userCollectionService.deleteUserCollection(
      userCollectionID,
      user.uid,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => UserCollection, {
    description: 'Move user collection into new parent or root',
  })
  @UseGuards(GqlAuthGuard)
  async moveUserCollection(
    @Args() args: MoveUserCollectionArgs,
    @GqlUser() user: AuthUser,
  ) {
    const res = await this.userCollectionService.moveUserCollection(
      args.userCollectionID,
      args.destCollectionID,
      user.uid,
    );
    if (E.isLeft(res)) {
      throwErr(res.left);
    }
    return res.right;
  }

  @Mutation(() => Boolean, {
    description: 'Move user collection into new parent or root',
  })
  @UseGuards(GqlAuthGuard)
  async updateUserCollectionOrder(
    @Args() args: UpdateUserCollectionArgs,
    @GqlUser() user: AuthUser,
  ) {
    const res = await this.userCollectionService.updateUserCollectionOrder(
      args.collectionID,
      args.nextCollectionID,
      user.uid,
    );
    if (E.isLeft(res)) {
      throwErr(res.left);
    }
    return res.right;
  }

  // Subscriptions
  @Subscription(() => UserCollection, {
    description: 'Listen for User Collection Creation',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userCollectionCreated(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_coll/${user.uid}/created`);
  }

  @Subscription(() => UserCollection, {
    description: 'Listen to when a User Collection has been updated.',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userCollectionUpdated(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_coll/${user.uid}/updated`);
  }

  @Subscription(() => ID, {
    description: 'Listen to when a User Collection has been deleted',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userCollectionRemoved(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_coll/${user.uid}/deleted`);
  }

  @Subscription(() => UserCollection, {
    description: 'Listen to when a User Collection has been moved',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userCollectionMoved(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_coll/${user.uid}/moved`);
  }

  @Subscription(() => UserCollectionReorderData, {
    description: 'Listen to when a User Collections position has changed',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userCollectionOrderUpdated(@GqlUser() user: AuthUser) {
    return this.pubSub.asyncIterator(`user_coll/${user.uid}/order_updated`);
  }
}
